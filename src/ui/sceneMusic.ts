import { BackgroundMusic } from "./backgroundMusic";

export type MusicScene = "menu" | "game" | "silent";
type Loop = Pick<BackgroundMusic, "unlock" | "setEnabled" | "setPlaying" | "dispose">;

/** Scene owns exclusivity; each loop owns decoding, autoplay and visibility. */
export class SceneMusic {
  private readonly menu: Loop;
  private readonly game: Loop;
  private scene: MusicScene = "silent";

  constructor(sources: { menu: string; game: string }, make: (src: string) => Loop = src => new BackgroundMusic(src)) {
    this.menu = make(sources.menu);
    this.game = make(sources.game);
  }

  unlock(): void { this.menu.unlock(); this.game.unlock(); }
  setEnabled(enabled: boolean): void { this.menu.setEnabled(enabled); this.game.setEnabled(enabled); }

  setScene(scene: MusicScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    // Stop the outgoing track before requesting the incoming one, even if cached.
    this.menu.setPlaying(false);
    this.game.setPlaying(false);
    if (scene === "menu") this.menu.setPlaying(true);
    if (scene === "game") this.game.setPlaying(true);
  }

  dispose(): void { this.menu.dispose(); this.game.dispose(); }
}
