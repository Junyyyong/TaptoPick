/** One optional, lazy-loaded loop. Music failure must never interrupt a game. */
export class BackgroundMusic {
  private context: AudioContext | undefined;
  private gain: GainNode | undefined;
  private buffer: AudioBuffer | undefined;
  private loading: Promise<AudioBuffer> | undefined;
  private source: AudioBufferSourceNode | undefined;
  private enabled = true;
  private playing = false;
  private unlocked = false;
  private disposed = false;
  private revision = 0;
  private offset = 0;
  private startedAt = 0;
  private request: AbortController | undefined;
  private readonly visibility = () => this.sync();

  constructor(private readonly src: string) {
    document.addEventListener("visibilitychange", this.visibility);
  }

  /** Call from pointer/key input; never assumes browser autoplay permission. */
  unlock(): void {
    if (this.disposed) return;
    this.unlocked = true;
    if (!this.context) {
      const Constructor = window.AudioContext
        ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      try {
        this.context = new Constructor();
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.context.destination);
      } catch {
        return;
      }
    }
    this.sync();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.sync();
  }

  /** True only where BGM belongs; false for pause, results, and video. */
  setPlaying(playing: boolean): void {
    if (this.playing === playing) return;
    this.playing = playing;
    this.sync();
  }

  private shouldPlay(): boolean {
    return !this.disposed && this.unlocked && this.enabled && this.playing && !document.hidden;
  }

  private sync(): void {
    const revision = ++this.revision;
    const context = this.context;
    if (!this.shouldPlay()) {
      this.stop();
      if (context && context.state !== "closed") void context.suspend().catch(() => {});
      return;
    }
    if (!context || !this.gain || context.state === "closed") return;
    void this.start(context, revision);
  }

  private async start(context: AudioContext, revision: number): Promise<void> {
    try {
      // Resume is invoked synchronously until its first await, within the gesture.
      if (context.state !== "running") await context.resume();
      if (!this.shouldPlay()) {
        if (context.state !== "closed") await context.suspend();
        return;
      }
      const buffer = this.buffer ?? await this.load(context);
      if (revision !== this.revision || !this.shouldPlay() || this.source
        || context.state !== "running" || !this.gain) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
      source.connect(this.gain);
      this.gain.gain.cancelScheduledValues(context.currentTime);
      this.gain.gain.setValueAtTime(0, context.currentTime);
      this.gain.gain.linearRampToValueAtTime(0.28, context.currentTime + 0.35);
      this.startedAt = context.currentTime;
      source.start(0, this.offset % buffer.duration);
      this.source = source;
    } catch {
      // Autoplay, offline, unsupported decoding: stay silent; next gesture retries.
      if (!this.source && this.context?.state === "running") {
        void this.context.suspend().catch(() => {});
      }
    }
  }

  private load(context: AudioContext): Promise<AudioBuffer> {
    if (!this.loading) {
      this.request = new AbortController();
      this.loading = fetch(this.src, { signal: this.request.signal })
        .then(response => {
          if (!response.ok) throw new Error("Music unavailable");
          return response.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes))
        .then(buffer => {
          if (!(buffer.duration > 0)) throw new Error("Empty music");
          this.buffer = buffer;
          return buffer;
        })
        .catch(error => {
          this.loading = undefined;
          throw error;
        });
    }
    return this.loading;
  }

  private stop(): void {
    const source = this.source;
    if (!source) return;
    if (this.context && this.buffer) {
      this.offset = (this.offset + this.context.currentTime - this.startedAt) % this.buffer.duration;
    }
    this.source = undefined;
    try { source.stop(); } catch { /* It may already have stopped. */ }
    source.disconnect();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.revision++;
    document.removeEventListener("visibilitychange", this.visibility);
    this.request?.abort();
    this.stop();
    this.gain?.disconnect();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
  }
}
