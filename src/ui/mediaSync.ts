/** The video is the clock: never let the separate soundtrack lead it. */
export class MediaSync {
  private active = false;
  private running = false;
  private enabled = true;
  private pending = false;
  private version = 0;

  constructor(private video: HTMLVideoElement, private audio: HTMLAudioElement) {
    video.addEventListener("playing", () => {
      if (!this.active) return;
      this.running = true;
      this.sync();
    });
    for (const event of ["waiting", "pause", "seeking", "ended", "error", "emptied"]) {
      video.addEventListener(event, () => this.suspend());
    }
    video.addEventListener("timeupdate", () => this.sync());
    audio.addEventListener("loadedmetadata", () => this.sync());
    audio.addEventListener("playing", () => {
      if (!this.canPlay()) this.audio.pause();
      else this.align();
    });
  }

  start(enabled: boolean): void {
    this.stop();
    this.active = true;
    this.enabled = enabled;
  }

  stop(): void {
    this.version++;
    this.active = false;
    this.pending = false;
    this.suspend();
  }

  suspend(): void {
    this.running = false;
    this.audio.pause();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.audio.pause();
    else this.sync();
  }

  private canPlay(): boolean {
    return this.active && this.enabled && this.running && !this.video.paused && !this.video.ended;
  }

  private align(): boolean {
    if (this.audio.readyState < 1) return false;
    try {
      if (Math.abs(this.audio.currentTime - this.video.currentTime) > 0.12) {
        this.audio.currentTime = this.video.currentTime;
      }
      return true;
    } catch { return false; }
  }

  private sync(): void {
    if (!this.canPlay() || !this.align() || !this.audio.paused || this.pending) return;
    const version = this.version;
    this.pending = true;
    void this.audio.play().catch(() => {}).finally(() => {
      if (version !== this.version) return;
      this.pending = false;
      if (!this.canPlay()) this.audio.pause();
    });
  }
}
