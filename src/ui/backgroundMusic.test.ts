import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundMusic } from "./backgroundMusic";

class FakeDocument extends EventTarget {
  hidden = false;
}

class FakeContext {
  static instances: FakeContext[] = [];
  state = "suspended";
  currentTime = 10;
  destination = {};
  sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; loop?: boolean; loopEnd?: number }[] = [];
  resume = vi.fn(async () => { this.state = "running"; });
  suspend = vi.fn(async () => { this.state = "suspended"; });
  close = vi.fn(async () => { this.state = "closed"; });
  decodeAudioData = vi.fn(async () => ({ duration: 38.4 }));
  gain = {
    gain: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(), disconnect: vi.fn(),
  };
  constructor() { FakeContext.instances.push(this); }
  createGain() { return this.gain; }
  createBufferSource() {
    const source = { start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };
    this.sources.push(source);
    return source;
  }
}

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const response = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
let doc: FakeDocument;
let music: BackgroundMusic;

beforeEach(() => {
  FakeContext.instances = [];
  doc = new FakeDocument();
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { AudioContext: FakeContext });
  vi.stubGlobal("fetch", vi.fn(async () => response()));
  music = new BackgroundMusic("/assets/audio/pick-garden.mp3");
});

afterEach(() => {
  music.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("optional background music", () => {
  it("does not create audio or fetch a file before a gesture", async () => {
    music.setPlaying(true);
    await flush();
    expect(FakeContext.instances).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("tries autoplay without a gesture only when explicitly requested by a visible scene", async () => {
    const states = vi.fn();
    music.dispose();
    music = new BackgroundMusic("menu.mp3", states);
    music.attemptAutoplay();
    expect(FakeContext.instances).toHaveLength(0);
    music.setPlaying(true);
    music.attemptAutoplay();
    await flush();
    expect(FakeContext.instances[0]?.sources).toHaveLength(1);
    expect(states.mock.calls.map(([state]) => state)).toEqual(["loading", "playing"]);
  });

  it("does not force autoplay when muted or hidden", async () => {
    music.setPlaying(true);
    music.setEnabled(false);
    music.attemptAutoplay();
    expect(FakeContext.instances).toHaveLength(0);
    music.setEnabled(true);
    doc.hidden = true;
    music.attemptAutoplay();
    await flush();
    expect(FakeContext.instances).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports pending autoplay as blocked, preloads, then starts on a tap without a second download", async () => {
    vi.useFakeTimers();
    const states = vi.fn();
    music.dispose();
    music = new BackgroundMusic("menu.mp3", states);
    music.unlock();
    const context = FakeContext.instances[0]!;
    let resumeOld!: () => void;
    context.resume.mockImplementationOnce(() => new Promise<void>(resolve => { resumeOld = resolve; }));
    music.setPlaying(true);
    await flush();
    expect(fetch).toHaveBeenCalledOnce();
    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    expect(context.sources).toHaveLength(0);
    vi.advanceTimersByTime(500);
    expect(states).toHaveBeenLastCalledWith("blocked");
    music.unlock();
    await flush();
    expect(states).toHaveBeenLastCalledWith("playing");
    expect(context.sources).toHaveLength(1);
    expect(fetch).toHaveBeenCalledOnce();
    resumeOld();
    await flush();
    expect(context.sources).toHaveLength(1);
  });

  it("reports rejected autoplay and retries on a later gesture", async () => {
    const states = vi.fn();
    music.dispose();
    music = new BackgroundMusic("menu.mp3", states);
    music.unlock();
    const context = FakeContext.instances[0]!;
    context.resume.mockRejectedValueOnce(new DOMException("Gesture required", "NotAllowedError"));
    music.setPlaying(true);
    await flush();
    expect(states).toHaveBeenLastCalledWith("blocked");
    music.unlock();
    await flush();
    expect(states).toHaveBeenLastCalledWith("playing");
    expect(context.sources).toHaveLength(1);
  });

  it("cancels the blocked prompt and stale pending resume when the scene ends", async () => {
    vi.useFakeTimers();
    const states = vi.fn();
    music.dispose();
    music = new BackgroundMusic("menu.mp3", states);
    music.unlock();
    const context = FakeContext.instances[0]!;
    let finish!: () => void;
    context.resume.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    music.setPlaying(true);
    await flush();
    music.setPlaying(false);
    vi.advanceTimersByTime(1000);
    finish();
    await flush();
    expect(states).toHaveBeenLastCalledWith("idle");
    expect(states).not.toHaveBeenCalledWith("blocked");
    expect(context.sources).toHaveLength(0);
  });

  it("reports failed audio loading without interrupting a scene and permits a retry", async () => {
    const states = vi.fn();
    music.dispose();
    music = new BackgroundMusic("menu.mp3", states);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    music.setPlaying(true);
    music.attemptAutoplay();
    await flush();
    expect(states).toHaveBeenLastCalledWith("unavailable");
    music.unlock();
    await flush();
    expect(states).toHaveBeenLastCalledWith("playing");
  });

  it("starts one decoded loop and reuses it through repeated gestures", async () => {
    music.setPlaying(true);
    music.unlock();
    music.unlock();
    await flush();
    music.unlock();
    await flush();
    const context = FakeContext.instances[0]!;
    expect(FakeContext.instances).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0]?.loop).toBe(true);
    expect(context.sources[0]?.loopEnd).toBe(38.4);
    expect(context.sources[0]?.start).toHaveBeenCalledWith(0, 0);
  });

  it("does not fetch while disabled, and preserves its position on pause", async () => {
    music.setEnabled(false);
    music.setPlaying(true);
    music.unlock();
    await flush();
    expect(fetch).not.toHaveBeenCalled();
    music.setEnabled(true);
    await flush();
    const context = FakeContext.instances[0]!;
    context.currentTime = 13;
    music.setPlaying(false);
    expect(context.sources[0]?.stop).toHaveBeenCalledOnce();
    expect(context.state).toBe("suspended");
    music.setPlaying(true);
    await flush();
    expect(context.sources[1]?.start).toHaveBeenCalledWith(0, 3);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stops and suspends in a hidden tab, resuming only when still requested", async () => {
    music.setPlaying(true);
    music.unlock();
    await flush();
    const context = FakeContext.instances[0]!;
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(context.sources[0]?.stop).toHaveBeenCalledOnce();
    expect(context.state).toBe("suspended");
    music.setPlaying(false);
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(context.sources).toHaveLength(1);
  });

  it("resumes from a hidden tab without creating overlapping loops", async () => {
    music.setPlaying(true);
    music.unlock();
    await flush();
    const context = FakeContext.instances[0]!;
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    doc.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(context.sources).toHaveLength(2);
    expect(context.sources[0]?.stop).toHaveBeenCalledOnce();
    expect(context.sources[1]?.start).toHaveBeenCalledOnce();
  });

  it("does not let a slow download start after leaving the game", async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { finish = resolve; })));
    music.setPlaying(true);
    music.unlock();
    await flush();
    music.setPlaying(false);
    finish(response());
    await flush();
    expect(FakeContext.instances[0]?.sources).toHaveLength(0);
    expect(FakeContext.instances[0]?.state).toBe("suspended");
    music.setPlaying(true);
    await flush();
    expect(FakeContext.instances[0]?.sources).toHaveLength(1);
  });

  it("recovers after unavailable audio on a later gesture", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    music.setPlaying(true);
    music.unlock();
    await flush();
    expect(FakeContext.instances[0]?.sources).toHaveLength(0);
    music.unlock();
    await flush();
    expect(FakeContext.instances[0]?.sources).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("handles blocked autoplay without throwing and retries on user input", async () => {
    music.unlock();
    const context = FakeContext.instances[0]!;
    context.resume.mockRejectedValueOnce(new Error("NotAllowedError"));
    music.setPlaying(true);
    await flush();
    expect(context.sources).toHaveLength(0);
    music.unlock();
    await flush();
    expect(context.sources).toHaveLength(1);
  });

  it("closes the context and removes its listener when disposed", async () => {
    music.setPlaying(true);
    music.unlock();
    await flush();
    const context = FakeContext.instances[0]!;
    music.dispose();
    music.unlock();
    doc.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(context.sources[0]?.stop).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.sources).toHaveLength(1);
    expect(context.state).toBe("closed");
  });

  it("stays silent on a device without Web Audio", async () => {
    vi.stubGlobal("window", {});
    music.setPlaying(true);
    music.unlock();
    await flush();
    expect(FakeContext.instances).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});
