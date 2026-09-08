import { describe, it, expect, vi } from "vitest";
import { SceneMusic } from "./sceneMusic";

function setup() {
  const events: string[] = [];
  const loops = new Map<string, { unlock: ReturnType<typeof vi.fn>; setEnabled: ReturnType<typeof vi.fn>; setPlaying: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }>();
  const music = new SceneMusic({menu:"menu.mp3",game:"game.mp3"}, src => {
    const loop = {unlock:vi.fn(),setEnabled:vi.fn(),setPlaying:vi.fn((playing:boolean)=>events.push(`${src}:${playing}`)),dispose:vi.fn()};
    loops.set(src,loop);return loop;
  });
  return {music,events,loops};
}

describe("menu and game music",()=>{
  it("does not start on construction; unlock and mute cover both tracks",()=>{
    const {music,events,loops}=setup();expect(events).toEqual([]);
    music.unlock();music.setEnabled(false);
    for(const loop of loops.values()){expect(loop.unlock).toHaveBeenCalledOnce();expect(loop.setEnabled).toHaveBeenCalledWith(false);}
  });
  it("stops menu before starting game, then stops game before returning to menu",()=>{
    const {music,events}=setup();music.setScene("menu");events.length=0;
    music.setScene("game");expect(events).toEqual(["menu.mp3:false","game.mp3:false","game.mp3:true"]);
    events.length=0;music.setScene("menu");expect(events).toEqual(["menu.mp3:false","game.mp3:false","menu.mp3:true"]);
  });
  it("does not restart a scene on repeated updates; silence stops both",()=>{
    const {music,events}=setup();music.setScene("menu");events.length=0;
    music.setScene("menu");expect(events).toEqual([]);
    music.setScene("silent");expect(events).toEqual(["menu.mp3:false","game.mp3:false"]);
  });
  it("disposes both loops",()=>{const {music,loops}=setup();music.dispose();for(const loop of loops.values())expect(loop.dispose).toHaveBeenCalledOnce();});
});
