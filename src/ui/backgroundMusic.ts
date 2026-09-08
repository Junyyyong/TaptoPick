export type MusicPlaybackState = "idle" | "loading" | "playing" | "blocked" | "unavailable";

/** One optional loop. Browser autoplay policy always has the final say. */
export class BackgroundMusic {
  private context: AudioContext | undefined;
  private gain: GainNode | undefined;
  private buffer: AudioBuffer | undefined;
  private loading: Promise<AudioBuffer> | undefined;
  private source: AudioBufferSourceNode | undefined;
  private enabled = true;
  private playing = false;
  private canAttempt = false;
  private disposed = false;
  private revision = 0;
  private offset = 0;
  private startedAt = 0;
  private request: AbortController | undefined;
  private blockedTimer: ReturnType<typeof setTimeout> | undefined;
  private playbackState: MusicPlaybackState = "idle";
  private readonly visibility = () => this.sync();

  constructor(private readonly src: string, private readonly onState: (state: MusicPlaybackState) => void = () => {}) {
    document.addEventListener("visibilitychange", this.visibility);
  }

  /** A gesture retries a blocked request without requiring entry into a game. */
  unlock(): void {
    if (this.disposed) return;
    this.canAttempt = true;
    this.ensureContext();
    this.sync();
  }

  /** Try once on scene entry; browsers may deny or defer context.resume(). */
  attemptAutoplay(): void {
    if (this.disposed || !this.enabled || !this.playing || document.hidden) return;
    this.canAttempt = true;
    this.ensureContext();
    this.sync();
  }

  private ensureContext(): void {
    if (!this.context) {
      const Constructor = window.AudioContext
        ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) { this.report("unavailable"); return; }
      try {
        this.context = new Constructor();
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.context.destination);
      } catch {
        this.report("unavailable");
        return;
      }
    }
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
    return !this.disposed && this.canAttempt && this.enabled && this.playing && !document.hidden;
  }

  private sync(): void {
    const revision = ++this.revision;
    clearTimeout(this.blockedTimer);
    const context = this.context;
    if (!this.shouldPlay()) {
      this.stop();
      this.report("idle");
      if (context && context.state !== "closed") void context.suspend().catch(() => {});
      return;
    }
    if (!context || !this.gain || context.state === "closed") return;
    void this.start(context, revision);
  }

  private async start(context: AudioContext, revision: number): Promise<void> {
    try {
      if (this.source && context.state === "running") { this.report("playing"); return; }
      this.report("loading");
      // Call resume synchronously so touchend/click activation is not lost.
      const resumed = context.state === "running" ? Promise.resolve() : context.resume();
      if (context.state !== "running") {
        // Chrome can leave resume pending instead of rejecting blocked autoplay.
        this.blockedTimer = setTimeout(() => {
          if (revision === this.revision && this.shouldPlay() && context.state !== "running") this.report("blocked");
        }, 500);
      }
      // Decode concurrently even when autoplay is blocked, making the first tap fast.
      const [buffer] = await Promise.all([this.buffer ?? this.load(context), resumed]);
      if (revision !== this.revision || !this.shouldPlay()
        || context.state !== "running" || !this.gain) return;
      clearTimeout(this.blockedTimer);
      if (this.source) { this.report("playing"); return; }
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
      this.report("playing");
    } catch {
      if (revision !== this.revision || !this.shouldPlay()) return;
      clearTimeout(this.blockedTimer);
      this.report(context.state === "suspended" ? "blocked" : "unavailable");
      // Offline, unsupported decoding, or denied autoplay: next gesture retries.
      if (!this.source && this.context?.state === "running") {
        void this.context.suspend().catch(() => {});
      }
    }
  }

  private report(state: MusicPlaybackState): void {
    if (this.playbackState === state) return;
    this.playbackState = state;
    this.onState(state);
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
    clearTimeout(this.blockedTimer);
    document.removeEventListener("visibilitychange", this.visibility);
    this.request?.abort();
    this.stop();
    this.report("idle");
    this.gain?.disconnect();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
  }
}
