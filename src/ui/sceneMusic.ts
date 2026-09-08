import { BackgroundMusic, type MusicPlaybackState } from "./backgroundMusic";

export type MusicScene = "menu" | "game" | "silent";
type Loop = Pick<BackgroundMusic, "unlock" | "attemptAutoplay" | "setEnabled" | "setPlaying" | "dispose">;
type StateListener = (scene: MusicScene, state: MusicPlaybackState) => void;
type LoopFactory = (src: string, onState: (state: MusicPlaybackState) => void) => Loop;

/** Scene owns exclusivity; each loop owns decoding, autoplay and visibility. */
export class SceneMusic {
  private readonly menu: Loop;
  private readonly game: Loop;
  private scene: MusicScene = "silent";

  constructor(
    sources: { menu: string; game: string },
    make: LoopFactory = (src, onState) => new BackgroundMusic(src, onState),
    private readonly onState?: StateListener,
  ) {
    const forward = (scene: "menu" | "game") => (state: MusicPlaybackState): void => {
      // An outgoing decode/resume may settle later; only expose the current scene.
      if (this.scene === scene) this.onState?.(scene, state);
    };
    this.menu = make(sources.menu, forward("menu"));
    this.game = make(sources.game, forward("game"));
  }

  unlock(): void { this.menu.unlock(); this.game.unlock(); }
  setEnabled(enabled: boolean): void { this.menu.setEnabled(enabled); this.game.setEnabled(enabled); }

  setScene(scene: MusicScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    // Stop the outgoing track before requesting the incoming one, even if cached.
    this.menu.setPlaying(false);
    this.game.setPlaying(false);
    this.onState?.(scene, "idle");
    if (scene === "menu") {
      this.menu.setPlaying(true);
      // Autoplay is allowed on some browsers; others will request a real tap.
      this.menu.attemptAutoplay();
    }
    if (scene === "game") this.game.setPlaying(true);
  }

  dispose(): void { this.menu.dispose(); this.game.dispose(); }
}
