import { APP_CONFIG } from "../config/app";
import { ALL_PIECES, MEMORY_REVEAL_DELAY_MS, MONTAGE_CHARACTERS, PICTURE_PIECES_SCORE_BANDS, PICTURE_PIECES_TIME_LIMIT_MS, PUZZLE_CHARACTERS, type MontageCharacter, type PuzzleCharacter } from "../content/puzzles";
import { createMemoryBoard, createMontageBoard, createUnitBoard, montageScore, tieredTimeScore, timeScore, type MemoryCard } from "../core/pick/game";
import { el } from "./dom";
import { feedback } from "./feedback";
import { Cheer } from "./screens/cheer";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = "unit" | "montage" | "memory";

const MONTAGE_LIMIT_MS = 60_000;
const memoryColorAt = (index: number): number => ((index * 5 + Math.floor(index / 7) * 2) % 9) + 1;

function formatTime(ms: number): string {
  const safe = Math.max(0, ms);
  const tenths = Math.floor(safe / 100) % 10;
  const seconds = Math.floor(safe / 1000) % 60;
  const minutes = Math.floor(safe / 60_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export class TalkApp {
  private readonly cheer = new Cheer();
  private readonly studioSplash = el("screen-studio-splash");
  private readonly splash = el("screen-splash");
  private readonly title = el("screen-title");
  private readonly game = el("screen-game");
  private readonly board = el("picture-board");
  private readonly clock = el("run-clock");
  private readonly runMode = el("run-mode");
  private readonly targetPreview = el("target-preview");
  private readonly progressLabel = el("progress-label");
  private readonly progressFill = el("progress-fill");
  private readonly gameNote = el("game-note");
  private readonly result = el("result-layer");
  private readonly resultTitle = el("result-title");
  private readonly resultDetail = el("result-detail");
  private readonly help = el("help-layer");
  private readonly helpTitle = el("help-title");
  private readonly helpBody = el("help-body");

  private preferences: TalkPreferences = loadTalkPreferences();
  private mode: Mode = "unit";
  private active = false;
  private paused = false;
  private startedAt = 0;
  private elapsedMs = 0;
  private frame?: number;
  private mistakes = 0;
  private targetCharacter = PUZZLE_CHARACTERS[0]!;
  private montageCharacter: MontageCharacter = MONTAGE_CHARACTERS[0]!;
  private unitFound = new Set<number>();
  private montageFound = 0;
  private memoryCards: MemoryCard[] = [];
  private memoryOpen = new Set<number>();
  private memoryMatched = new Set<number>();
  private memoryBusy = false;
  private memoryTimer?: number;

  constructor() {
    el("mode-unit").addEventListener("click", () => this.startMode("unit"));
    el("mode-montage").addEventListener("click", () => this.startMode("montage"));
    el("mode-memory").addEventListener("click", () => this.startMode("memory"));
    el("btn-back").addEventListener("click", () => this.showTitle());
    el("btn-pause").addEventListener("click", () => this.pauseGame());
    el("btn-restart").addEventListener("click", () => this.startMode(this.mode));
    el("btn-again").addEventListener("click", () => this.startMode(this.mode));
    el("btn-result-menu").addEventListener("click", () => this.showTitle());
    el("btn-title-tutorial").addEventListener("click", () => this.showHowToPlay());
    el("btn-title-settings").addEventListener("click", () => this.showSettings());
    el("btn-title-rules").addEventListener("click", () => this.showRules());
    el("btn-help-close").addEventListener("click", () => this.closeHelp());
    document.addEventListener("pointerdown", () => { this.cheer.unlock(); feedback.unlock(); }, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.active && !this.paused) this.pauseGame();
    });
    this.applyPreferences();
    window.setTimeout(() => this.showProductSplash(), APP_CONFIG.timing.studioSplashMs);
    window.setTimeout(() => this.showTitle(), APP_CONFIG.timing.studioSplashMs + APP_CONFIG.timing.productSplashMs);
  }

  private showProductSplash(): void {
    this.studioSplash.classList.add("hidden");
    this.splash.classList.remove("hidden");
  }

  private showTitle(): void {
    this.active = false;
    this.paused = false;
    this.stopClock();
    window.clearTimeout(this.memoryTimer);
    this.cheer.stop();
    this.help.classList.add("hidden");
    this.result.classList.add("hidden");
    this.studioSplash.classList.add("hidden");
    this.splash.classList.add("hidden");
    this.game.classList.add("hidden");
    this.title.classList.remove("hidden");
  }

  private startMode(mode: Mode): void {
    this.mode = mode;
    this.active = true;
    this.paused = false;
    this.elapsedMs = 0;
    this.mistakes = 0;
    this.unitFound.clear();
    this.montageFound = 0;
    this.memoryOpen.clear();
    this.memoryMatched.clear();
    this.memoryBusy = false;
    window.clearTimeout(this.memoryTimer);
    this.cheer.stop();
    this.result.classList.add("hidden");
    this.help.classList.add("hidden");
    this.title.classList.add("hidden");
    this.splash.classList.add("hidden");
    this.game.classList.remove("hidden", "is-input-locked");
    this.game.classList.toggle("is-memory-mode", mode === "memory");

    if (mode === "unit") this.startUnitRound();
    if (mode === "montage") this.startMontageRound();
    if (mode === "memory") this.startMemoryRound();
    this.startClock();
  }

  private startUnitRound(): void {
    this.targetCharacter = PUZZLE_CHARACTERS[Math.floor(Math.random() * PUZZLE_CHARACTERS.length)]!;
    const tiles = createUnitBoard(this.targetCharacter.id, ALL_PIECES);
    this.setBoardSize(7);
    this.runMode.textContent = "Picture Pieces";
    this.gameNote.textContent = "60 seconds · Finish faster to earn up to 1,500 points.";
    this.renderUnitPreview(this.targetCharacter);
    this.updateProgress(0, this.targetCharacter.pieces.length, `0 / ${this.targetCharacter.pieces.length} pieces`);

    const fragment = document.createDocumentFragment();
    tiles.forEach((tile) => {
      const button = this.imageButton(tile.src, `${tile.characterId} picture piece`);
      button.addEventListener("click", () => {
        if (!this.active || this.paused || this.unitFound.has(tile.pieceIndex)) return;
        if (!tile.target) {
          this.mistakes += 1;
          feedback.reject();
          this.flashWrong(button);
          return;
        }
        this.unitFound.add(tile.pieceIndex);
        this.revealUnitPiece(tile.pieceIndex);
        button.classList.add("is-found");
        button.disabled = true;
        feedback.pick(this.unitFound.size);
        this.updateProgress(this.unitFound.size, this.targetCharacter.pieces.length, `${this.unitFound.size} / ${this.targetCharacter.pieces.length} pieces`);
        if (this.unitFound.size === this.targetCharacter.pieces.length) this.finishUnit();
      });
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private startMontageRound(): void {
    this.setBoardSize(5, true);
    this.runMode.textContent = "Montage Hunt";
    this.gameNote.textContent = "60 seconds · Find the exact character. A new board appears after every match.";
    this.renderNextMontage();
  }

  private renderNextMontage(): void {
    this.montageCharacter = MONTAGE_CHARACTERS[Math.floor(Math.random() * MONTAGE_CHARACTERS.length)]!;
    this.renderImagePreview(this.montageCharacter.answer, `${this.montageCharacter.name} exact montage`);
    this.updateProgress(this.montageFound, Math.max(1, this.montageFound + 1), `${this.montageFound} found`);

    const fragment = document.createDocumentFragment();
    createMontageBoard(this.montageCharacter.variations.length).forEach((tile) => {
      const src = tile.exact ? this.montageCharacter.answer : this.montageCharacter.variations[tile.variationIndex]!;
      const button = this.montageButton(src, this.montageCharacter.name);
      button.addEventListener("click", () => {
        if (!this.active || this.paused) return;
        if (!tile.exact) {
          this.mistakes += 1;
          feedback.reject();
          this.flashWrong(button);
          return;
        }
        this.montageFound += 1;
        feedback.clear(1);
        button.classList.add("is-found");
        window.setTimeout(() => { if (this.active && this.mode === "montage") this.renderNextMontage(); }, 180);
      });
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private startMemoryRound(): void {
    this.setBoardSize(7);
    this.runMode.textContent = "Pair Memory";
    this.gameNote.textContent = "The center star is free. Match the 24 pairs in the other 48 blocks.";
    this.targetPreview.replaceChildren();
    const badge = document.createElement("div");
    badge.className = "memory-target-badge";
    badge.innerHTML = "<strong>0/24</strong><span>PAIRS</span>";
    this.targetPreview.append(badge);
    this.memoryCards = createMemoryBoard(ALL_PIECES);
    this.updateProgress(0, 24, "0 / 24 pairs");
    this.renderMemoryBoard();
  }

  private renderMemoryBoard(): void {
    const matchedCount = this.targetPreview.querySelector("strong");
    if (matchedCount) matchedCount.textContent = `${this.memoryMatched.size}/24`;
    const fragment = document.createDocumentFragment();
    this.memoryCards.forEach((card, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `picture-tile memory-card memory-card--color-${memoryColorAt(index)}`;
      button.setAttribute("aria-label", card.free ? "Free center block" : "Face-down picture card");
      if (card.free) {
        button.classList.add("is-free");
        button.innerHTML = "<span class=memory-free>★</span>";
        button.disabled = true;
      } else {
        const open = this.memoryOpen.has(card.id) || this.memoryMatched.has(card.pairId);
        if (open) button.classList.add("is-open");
        if (this.memoryMatched.has(card.pairId)) button.classList.add("is-matched");
        const back = document.createElement("span");
        back.className = "memory-back";
        back.textContent = "?";
        const image = document.createElement("img");
        image.src = card.src;
        image.alt = "";
        button.append(back, image);
        button.disabled = this.memoryMatched.has(card.pairId);
        button.addEventListener("click", () => this.flipMemoryCard(card));
      }
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private flipMemoryCard(card: MemoryCard): void {
    if (!this.active || this.paused || this.memoryBusy || this.memoryOpen.has(card.id) || this.memoryMatched.has(card.pairId)) return;
    this.memoryOpen.add(card.id);
    feedback.tap();
    this.renderMemoryBoard();
    if (this.memoryOpen.size < 2) return;

    const openCards = this.memoryCards.filter((entry) => this.memoryOpen.has(entry.id));
    const matched = openCards[0]?.pairId === openCards[1]?.pairId;
    this.memoryBusy = true;
    this.memoryTimer = window.setTimeout(() => {
      if (matched && openCards[0]) {
        this.memoryMatched.add(openCards[0].pairId);
        feedback.clear(2);
      } else {
        this.mistakes += 1;
        feedback.reject();
      }
      this.memoryOpen.clear();
      this.memoryBusy = false;
      this.updateProgress(this.memoryMatched.size, 24, `${this.memoryMatched.size} / 24 pairs`);
      this.renderMemoryBoard();
      if (this.memoryMatched.size === 24) this.finishMemory();
    }, matched ? MEMORY_REVEAL_DELAY_MS.match : MEMORY_REVEAL_DELAY_MS.mismatch);
  }

  private imageButton(src: string, label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picture-tile";
    button.setAttribute("aria-label", label);
    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    button.append(image);
    return button;
  }

  private montageButton(src: string, characterName: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picture-tile";
    button.setAttribute("aria-label", `${characterName} montage candidate`);
    const image = document.createElement("img");
    image.className = "montage-candidate-image";
    image.src = src;
    image.alt = "";
    button.append(image);
    return button;
  }

  private renderUnitPreview(character: PuzzleCharacter): void {
    const reveal = document.createElement("div");
    reveal.className = `unit-reveal unit-reveal--${character.pieces.length}`;
    reveal.setAttribute("aria-label", `${character.name} picture progress`);

    const grayscale = document.createElement("img");
    grayscale.className = "unit-reveal-base";
    grayscale.src = character.preview;
    grayscale.alt = "";
    reveal.append(grayscale);

    character.pieces.forEach((_, pieceIndex) => {
      const row = Math.floor(pieceIndex / character.columns);
      const column = pieceIndex % character.columns;
      const color = document.createElement("img");
      color.className = "unit-reveal-color";
      color.src = character.preview;
      color.alt = "";
      color.dataset.pieceIndex = String(pieceIndex);
      color.style.clipPath = `inset(${row / character.rows * 100}% ${(character.columns - column - 1) / character.columns * 100}% ${(character.rows - row - 1) / character.rows * 100}% ${column / character.columns * 100}%)`;
      reveal.append(color);
    });
    this.targetPreview.replaceChildren(reveal);
  }

  private revealUnitPiece(pieceIndex: number): void {
    this.targetPreview.querySelector<HTMLElement>(`[data-piece-index="${pieceIndex}"]`)?.classList.add("is-revealed");
  }

  private renderImagePreview(src: string, alt: string): void {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    this.targetPreview.replaceChildren(image);
  }

  private setBoardSize(size: 5 | 7 | 9, montage = false): void {
    this.board.classList.toggle("picture-board--5", size === 5);
    this.board.classList.toggle("picture-board--7", size === 7);
    this.board.classList.toggle("picture-board--9", size === 9);
    this.board.classList.toggle("is-montage", montage);
  }

  private updateProgress(value: number, total: number, label: string): void {
    this.progressLabel.textContent = label;
    this.progressFill.style.width = `${Math.min(100, total ? value / total * 100 : 0)}%`;
  }

  private flashWrong(button: HTMLButtonElement): void {
    button.classList.remove("is-wrong");
    void button.offsetWidth;
    button.classList.add("is-wrong");
  }

  private startClock(): void {
    this.stopClock();
    this.startedAt = performance.now() - this.elapsedMs;
    const tick = (): void => {
      if (!this.active || this.paused) return;
      this.elapsedMs = performance.now() - this.startedAt;
      if (this.mode === "unit" || this.mode === "montage") {
        const limit = this.mode === "unit" ? PICTURE_PIECES_TIME_LIMIT_MS : MONTAGE_LIMIT_MS;
        const remaining = Math.max(0, limit - this.elapsedMs);
        this.clock.textContent = formatTime(remaining);
        if (this.mode === "montage") this.progressFill.style.width = `${remaining / limit * 100}%`;
        if (remaining <= 0) {
          if (this.mode === "unit") this.finishUnitTimeout();
          else this.finishMontage();
          return;
        }
      } else {
        this.clock.textContent = formatTime(this.elapsedMs);
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopClock(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  private finishUnit(): void {
    if (this.elapsedMs > PICTURE_PIECES_TIME_LIMIT_MS) {
      this.finishUnitTimeout();
      return;
    }
    const score = tieredTimeScore(this.elapsedMs, PICTURE_PIECES_SCORE_BANDS);
    this.finishGame("PUZZLE COMPLETE", `You found every ${this.targetCharacter.name} piece.\n${formatTime(this.elapsedMs)} · ${this.mistakes} wrong picks · ${score.toLocaleString()} points`, score);
  }

  private finishUnitTimeout(): void {
    this.finishGame("TIME UP", `You found ${this.unitFound.size} of ${this.targetCharacter.pieces.length} ${this.targetCharacter.name} pieces.\n60 seconds · 0 points`, 0);
  }

  private finishMontage(): void {
    const score = montageScore(this.montageFound, this.mistakes);
    this.finishGame("TIME UP", `You found ${this.montageFound} exact matches in 60 seconds.\n${this.mistakes} wrong picks · ${score.toLocaleString()} points`, score);
  }

  private finishMemory(): void {
    const score = timeScore(this.elapsedMs, this.mistakes, 8000);
    this.finishGame("ALL PAIRS FOUND", `You matched all 24 pairs.\n${formatTime(this.elapsedMs)} · ${this.mistakes} misses · ${score.toLocaleString()} points`, score);
  }

  private finishGame(headline: string, detail: string, score: number): void {
    if (!this.active) return;
    this.active = false;
    this.stopClock();
    window.clearTimeout(this.memoryTimer);
    this.game.classList.add("is-input-locked");
    feedback.complete();
    this.cheer.play(headline, score, "NICE PICK!", () => {
      this.resultTitle.textContent = headline;
      this.resultDetail.textContent = detail;
      this.result.classList.remove("hidden");
    }, score);
  }

  private pauseGame(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    this.stopClock();
    this.game.classList.add("is-input-locked");
    this.openHelp("Paused", "<div class=pause-copy><strong>Take your time.</strong><p>Close this panel to resume the timer.</p></div>");
  }

  private closeHelp(): void {
    this.help.classList.add("hidden");
    if (this.paused && this.active) {
      this.paused = false;
      this.game.classList.remove("is-input-locked");
      this.startClock();
    }
  }

  private openHelp(title: string, html: string): void {
    this.helpTitle.textContent = title;
    this.helpBody.innerHTML = html;
    this.help.classList.remove("hidden");
  }

  private showHowToPlay(): void {
    this.openHelp("How to play", `<div class="rules-list"><p><b>1. Picture Pieces</b><span>Find every piece that belongs to the character on the 7×7 board before the 60-second timer runs out.</span></p><p><b>2. Montage Hunt</b><span>Find the one image that exactly matches the character above among 25 candidates. The character changes after every match.</span></p><p><b>3. Pair Memory</b><span>Flip two cards at a time and match all 24 pairs. The center star is a free block.</span></p></div>`);
  }

  private showRules(): void {
    this.openHelp("Scoring rules", `<div class="rules-list"><p><b>Picture Pieces</b><span>Up to 10 sec: 1,500 · 20 sec: 1,200 · 30 sec: 900 · 45 sec: 600 · 60 sec: 300 points.</span></p><p><b>Pair Memory</b><span>Finish faster and avoid missed pairs for a higher score.</span></p><p><b>60-second hunt</b><span>Each correct montage is worth 500 points. Each wrong pick costs 25 points.</span></p></div>`);
  }

  private showSettings(): void {
    this.openHelp("Settings", `<div class="switch-list"><button class="switch-row" data-setting="sound"><span class="switch-text"><b>Sound effects</b><small>Play sounds for picks and completed games.</small></span><span class="switch" role="switch" aria-checked="${this.preferences.soundOn}"><i class="switch-knob"></i></span></button><button class="switch-row" data-setting="haptics"><span class="switch-text"><b>Haptics</b><small>Use touch feedback on supported devices.</small></span><span class="switch" role="switch" aria-checked="${this.preferences.hapticsOn}"><i class="switch-knob"></i></span></button></div>`);
    this.helpBody.querySelectorAll<HTMLButtonElement>("[data-setting]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.setting === "sound") this.preferences.soundOn = !this.preferences.soundOn;
        if (button.dataset.setting === "haptics") this.preferences.hapticsOn = !this.preferences.hapticsOn;
        saveTalkPreferences(this.preferences);
        this.applyPreferences();
        this.showSettings();
      });
    });
  }

  private applyPreferences(): void {
    feedback.setSound(this.preferences.soundOn);
    feedback.setHaptics(this.preferences.hapticsOn);
    this.cheer.setSound(this.preferences.soundOn);
  }
}
