import { describe, it, expect, vi } from "vitest";
import type { MusicPlaybackState } from "./backgroundMusic";
import { SceneMusic } from "./sceneMusic";

function setup() {
  const events: string[] = [];
  const onState = vi.fn();
  const loops = new Map<string, {
    unlock: ReturnType<typeof vi.fn>;
    attemptAutoplay: ReturnType<typeof vi.fn>;
    setEnabled: ReturnType<typeof vi.fn>;
    setPlaying: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>();
  const reportState = new Map<string, (state: MusicPlaybackState) => void>();
  const music = new SceneMusic({ menu: "menu.mp3", game: "game.mp3" }, (src, report) => {
    const loop = {
      unlock: vi.fn(),
      attemptAutoplay: vi.fn(() => events.push(`${src}:autoplay`)),
      setEnabled: vi.fn(),
      setPlaying: vi.fn((playing: boolean) => events.push(`${src}:${playing}`)),
      dispose: vi.fn(),
    };
    loops.set(src, loop);
    reportState.set(src, report);
    return loop;
  }, onState);
  return { music, events, loops, onState, reportState };
}

describe("menu and game music", () => {
  it("does not start on construction; unlock and mute cover both tracks", () => {
    const { music, events, loops } = setup();
    expect(events).toEqual([]);
    music.unlock();
    music.setEnabled(false);
    for (const loop of loops.values()) {
      expect(loop.unlock).toHaveBeenCalledOnce();
      expect(loop.setEnabled).toHaveBeenCalledWith(false);
      expect(loop.attemptAutoplay).not.toHaveBeenCalled();
    }
  });

  it("requests permitted autoplay only on entering the menu", () => {
    const { music, events, loops } = setup();
    music.setScene("menu");
    expect(events).toEqual(["menu.mp3:false", "game.mp3:false", "menu.mp3:true", "menu.mp3:autoplay"]);
    expect(loops.get("game.mp3")!.attemptAutoplay).not.toHaveBeenCalled();
    events.length = 0;
    music.setScene("game");
    expect(events).toEqual(["menu.mp3:false", "game.mp3:false", "game.mp3:true"]);
    expect(loops.get("game.mp3")!.attemptAutoplay).not.toHaveBeenCalled();
  });

  it("stops the outgoing track before starting a cached incoming track", () => {
    const { music, events } = setup();
    music.setScene("game");
    events.length = 0;
    music.setScene("menu");
    expect(events).toEqual(["menu.mp3:false", "game.mp3:false", "menu.mp3:true", "menu.mp3:autoplay"]);
  });

  it("does not restart repeated scene updates; silence stops both without autoplay", () => {
    const { music, events, onState } = setup();
    music.setScene("menu");
    events.length = 0;
    music.setScene("menu");
    expect(events).toEqual([]);
    music.setScene("silent");
    expect(events).toEqual(["menu.mp3:false", "game.mp3:false"]);
    expect(onState).toHaveBeenLastCalledWith("silent", "idle");
  });

  it("exposes a blocked menu and successful playback to the title UI", () => {
    const { music, onState, reportState } = setup();
    music.setScene("menu");
    reportState.get("menu.mp3")!("blocked");
    expect(onState).toHaveBeenLastCalledWith("menu", "blocked");
    reportState.get("menu.mp3")!("playing");
    expect(onState).toHaveBeenLastCalledWith("menu", "playing");
  });

  it("ignores late states from an outgoing track and resets the prompt at a scene change", () => {
    const { music, onState, reportState } = setup();
    music.setScene("menu");
    reportState.get("menu.mp3")!("blocked");
    music.setScene("game");
    expect(onState).toHaveBeenLastCalledWith("game", "idle");
    onState.mockClear();
    reportState.get("menu.mp3")!("playing");
    expect(onState).not.toHaveBeenCalled();
    reportState.get("game.mp3")!("playing");
    expect(onState).toHaveBeenLastCalledWith("game", "playing");
    music.setScene("silent");
    onState.mockClear();
    reportState.get("game.mp3")!("blocked");
    reportState.get("menu.mp3")!("blocked");
    expect(onState).not.toHaveBeenCalled();
  });

  it("disposes both loops", () => {
    const { music, loops } = setup();
    music.dispose();
    for (const loop of loops.values()) expect(loop.dispose).toHaveBeenCalledOnce();
  });
});
