import { describe, expect, it, vi } from "vitest";
import { MediaSync } from "./mediaSync";

class Media extends EventTarget {
  paused = true;
  ended = false;
  readyState = 1;
  currentTime = 0;
  play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  emit(name: string): void { this.dispatchEvent(new Event(name)); }
}
function setup() {
  const video = new Media(), audio = new Media();
  const sync = new MediaSync(video as unknown as HTMLVideoElement, audio as unknown as HTMLAudioElement);
  sync.start(true);
  return { video, audio, sync };
}
describe("video-led soundtrack", () => {
  it("waits for actual video playing rather than the play request", () => {
    const { video, audio } = setup();
    video.paused = false;video.emit("timeupdate");
    expect(audio.play).not.toHaveBeenCalled();
    video.currentTime = 0.5;video.emit("playing");
    expect(audio.currentTime).toBe(0.5);expect(audio.play).toHaveBeenCalledOnce();
  });
  it("pauses on buffering and aligns before resuming", async () => {
    const { video, audio } = setup();
    video.paused = false;video.emit("playing");await Promise.resolve();await Promise.resolve();
    video.emit("waiting");expect(audio.paused).toBe(true);
    video.currentTime = 2;video.emit("timeupdate");expect(audio.paused).toBe(true);
    video.emit("playing");expect(audio.currentTime).toBe(2);expect(audio.paused).toBe(false);
  });
  it("waits for audio metadata then catches up to the video", () => {
    const { video, audio } = setup();audio.readyState = 0;
    video.paused = false;video.emit("playing");expect(audio.play).not.toHaveBeenCalled();
    audio.readyState = 1;video.currentTime = 1;audio.emit("loadedmetadata");
    expect(audio.currentTime).toBe(1);expect(audio.play).toHaveBeenCalledOnce();
  });
  it("corrects drift but leaves tiny timing differences alone", () => {
    const { video, audio } = setup();video.paused = false;video.emit("playing");
    audio.currentTime = .05;video.emit("timeupdate");expect(audio.currentTime).toBe(.05);
    audio.currentTime = 1;video.emit("timeupdate");expect(audio.currentTime).toBe(0);
  });
  it.each(["pause", "seeking", "ended", "error", "emptied"])("silences on %s", (event) => {
    const { video, audio } = setup();video.paused = false;video.emit("playing");
    video.emit(event);expect(audio.paused).toBe(true);
    audio.emit("playing");expect(audio.paused).toBe(true);
  });
  it("does not restart after stop or while muted", () => {
    const { video, audio, sync } = setup();video.paused = false;
    sync.setEnabled(false);video.emit("playing");expect(audio.play).not.toHaveBeenCalled();
    sync.stop();video.emit("playing");audio.emit("loadedmetadata");expect(audio.play).not.toHaveBeenCalled();
  });
  it("silences a delayed play completion after cancellation", async () => {
    const { video, audio, sync } = setup();
    let resolve!: () => void;
    audio.play.mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    video.paused = false;video.emit("playing");sync.stop();
    audio.paused = false;audio.emit("playing");resolve();await Promise.resolve();
    expect(audio.paused).toBe(true);
  });
});
