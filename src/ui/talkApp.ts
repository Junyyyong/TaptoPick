import { APP_CONFIG } from "../config/app";
import { ALL_PIECES, MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS, MONTAGE_CHARACTERS, PICTURE_PIECES_SCORE_BANDS, PICTURE_PIECES_TIME_LIMIT_MS, PUZZLE_CHARACTERS, type MontageCharacter, type PuzzleCharacter } from "../content/puzzles";
import { createMontageRound, createRandomIndexCycle, createUnitBoard, MONTAGE_LIMIT_MS, tieredTimeScore, timeScore, type MemoryCard } from "../core/pick/game";
import { MEMORY_STAGES, MemoryRun } from "../core/pick/memory";
import { el } from "./dom";
import { feedback } from "./feedback";
import { Cheer } from "./screens/cheer";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = "unit" | "montage" | "memory";

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
  private readonly targetCharacterName = el("target-character-name");
  private readonly progressLabel = el("progress-label");
  private readonly progressFill = el("progress-fill");
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
  private montageCharacterIndex = -1;
  private montageCharacterCycle: number[] = [];
  private unitFound = new Set<number>();
  private montageFound = 0;
  private montageNextAt?: number;
  private memoryRun?: MemoryRun;
  private memoryUpdatedAt = 0;
  private readonly memoryButtons = new Map<number, HTMLButtonElement>();

  constructor() {
    el("mode-unit").addEventListener("click", () => this.startMode("unit"));
    el("mode-montage").addEventListener("click", () => this.startMode("montage"));
    el("mode-memory").addEventListener("click", () => this.startMode("memory"));
    el("btn-back").addEventListener("click", () => this.showTitle());
    el("btn-pause").addEventListener("click", () => this.pauseGame());
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
    this.montageNextAt = undefined;
    this.memoryRun = undefined;
    this.memoryButtons.clear();
    this.cheer.stop();
    this.result.classList.add("hidden");
    this.help.classList.add("hidden");
    this.title.classList.add("hidden");
    this.splash.classList.add("hidden");
    this.game.classList.remove("hidden", "is-input-locked");
    this.game.classList.toggle("is-memory-mode", mode === "memory");
    this.game.classList.toggle("is-unit-mode", mode === "unit");
    this.targetCharacterName.classList.toggle("hidden", mode !== "unit");
    this.targetCharacterName.textContent = "";

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
    this.runMode.textContent = "Montage Hunt";
    this.montageCharacterCycle = createRandomIndexCycle(MONTAGE_CHARACTERS.length, this.montageCharacterIndex);
    this.renderNextMontage();
  }

  private renderNextMontage(): void {
    this.montageNextAt = undefined;
    if (!this.montageCharacterCycle.length) {
      this.montageCharacterCycle = createRandomIndexCycle(MONTAGE_CHARACTERS.length, this.montageCharacterIndex);
    }
    this.montageCharacterIndex = this.montageCharacterCycle.shift()!;
    this.montageCharacter = MONTAGE_CHARACTERS[this.montageCharacterIndex]!;
    const round = createMontageRound(this.montageCharacter.variations.length, this.montageFound);
    this.setBoardSize(round.side, true);
    this.renderImagePreview(this.montageCharacter.answer, `${this.montageCharacter.name} exact montage`);
    this.updateProgress(this.montageFound, Math.max(1, this.montageFound + 1), `${this.montageFound} found`);

    const fragment = document.createDocumentFragment();
    round.tiles.forEach((tile) => {
      const src = tile.exact ? this.montageCharacter.answer : this.montageCharacter.variations[tile.variationIndex]!;
      const button = this.montageButton(src, this.montageCharacter.name);
      button.addEventListener("click", () => {
        if (!this.active || this.paused || this.montageNextAt !== undefined) return;
        this.elapsedMs = performance.now() - this.startedAt;
        if (this.elapsedMs >= MONTAGE_LIMIT_MS) {
          this.finishMontage();
          return;
        }
        if (!tile.exact) {
          this.mistakes += 1;
          feedback.reject();
          this.flashWrong(button);
          return;
        }
        this.montageFound += 1;
        this.montageNextAt = this.elapsedMs + 180;
        feedback.clear(1);
        button.classList.add("is-found");
        this.progressLabel.textContent = `${this.montageFound} found`;
      });
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private startMemoryRound(): void {
    this.memoryRun = new MemoryRun(MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS);
    this.runMode.textContent = "Pair Memory";
    this.renderMemoryStage();
  }

  private renderMemoryStage(): void {
    const run = this.memoryRun!;
    this.setBoardSize(run.stage.size);
    this.targetPreview.replaceChildren();
    const badge = document.createElement("div");
    badge.className = "memory-target-badge";
    badge.innerHTML = `<span class="memory-stage-label">STAGE ${run.stageIndex + 1}/${MEMORY_STAGES.length} · ${run.stage.size}×${run.stage.size}</span><strong>0/${run.stage.pairs}</strong><span>PAIRS</span>`;
    this.targetPreview.append(badge);
    this.clock.textContent = `LOOK · ${Math.ceil(run.previewRemainingMs / 1000)}`;
    this.renderMemoryBoard();
  }

  private renderMemoryBoard(): void {
    this.memoryButtons.clear();
    const fragment = document.createDocumentFragment();
    this.memoryRun!.cards.forEach((card, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `picture-tile memory-card memory-card--color-${memoryColorAt(index)}`;
      if (card.free) {
        button.classList.add("is-free");
        button.innerHTML = '<span class="memory-free">★</span>';
        button.setAttribute("aria-label", "Free center star");
        button.disabled = true;
        fragment.append(button);
        return;
      }
      const back = document.createElement("span");
      back.className = "memory-back";
      back.textContent = "?";
      const image = document.createElement("img");
      image.src = card.src;
      image.alt = "";
      button.append(back, image);
      button.addEventListener("click", () => this.flipMemoryCard(card));
      this.memoryButtons.set(card.id, button);
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
    this.updateMemoryBoard();
  }

  private updateMemoryBoard(): void {
    const run = this.memoryRun!;
    const matchedCount = this.targetPreview.querySelector("strong");
    if (matchedCount) matchedCount.textContent = `${run.matchedPairs}/${run.stage.pairs}`;
    this.updateProgress(run.matchedPairs, run.stage.pairs, run.phase === "preview" ? "Memorize the faces" : `${run.matchedPairs} / ${run.stage.pairs} pairs`);
    run.cards.forEach((card) => {
      const button = this.memoryButtons.get(card.id);
      if (!button) return;
      const matched = run.matchedIds.has(card.id);
      const open = run.phase === "preview" || matched || run.openIds.has(card.id);
      button.classList.toggle("is-open", open);
      button.classList.toggle("is-matched", matched);
      button.disabled = open || run.phase !== "playing";
      button.setAttribute("aria-label", matched ? "Matched picture card" : open ? "Face-up picture card" : "Face-down picture card");
    });
  }

  private flipMemoryCard(card: MemoryCard): void {
    if (!this.active || this.paused) return;
    this.advanceMemoryClock(performance.now());
    if (!this.active) return;
    const pick = this.memoryRun!.choose(card.id);
    if (pick === "ignored") return;
    feedback.tap();
    if (pick === "match") feedback.clear(2);
    if (pick === "mismatch") feedback.reject();
    this.updateMemoryBoard();
  }

  private advanceMemoryClock(now: number): void {
    const run = this.memoryRun!;
    const phase = run.phase;
    const stage = run.stageIndex;
    run.advance(now - this.memoryUpdatedAt);
    this.memoryUpdatedAt = now;
    if (stage !== run.stageIndex) this.renderMemoryStage();
    else if (phase !== run.phase) this.updateMemoryBoard();
    this.clock.textContent = run.phase === "preview"
      ? `LOOK · ${Math.ceil(run.previewRemainingMs / 1000)}`
      : formatTime(run.remainingMs);
    if (run.phase === "won" || run.phase === "lost") this.finishMemory();
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
    this.targetCharacterName.textContent = character.name;
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

  private setBoardSize(size: 3 | 4 | 5 | 6 | 7 | 9, montage = false): void {
    this.board.classList.toggle("picture-board--3", size === 3);
    this.board.classList.toggle("picture-board--4", size === 4);
    this.board.classList.toggle("picture-board--5", size === 5);
    this.board.classList.toggle("picture-board--6", size === 6);
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
    this.memoryUpdatedAt = performance.now();
    const tick = (): void => {
      if (!this.active || this.paused) return;
      if (this.mode === "memory") {
        this.advanceMemoryClock(performance.now());
        if (this.active) this.frame = requestAnimationFrame(tick);
        return;
      }
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
        if (this.mode === "montage" && this.montageNextAt !== undefined && this.elapsedMs >= this.montageNextAt) this.renderNextMontage();
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
    this.finishGame("PUZZLE COMPLETE", `You found every ${this.targetCharacter.name} piece.\n${formatTime(this.elapsedMs)} · ${this.mistakes} wrong picks · ${score.toLocaleString()} points`, score, this.targetCharacter.id);
  }

  private finishUnitTimeout(): void {
    this.finishGame("TIME UP", `You found ${this.unitFound.size} of ${this.targetCharacter.pieces.length} ${this.targetCharacter.name} pieces.\n60 seconds · 0 points`, 0, this.targetCharacter.id);
  }

  private finishMontage(): void {
    this.finishGame("TIME UP", `You found ${this.montageFound} exact matches in 3 minutes.\n${this.mistakes} wrong picks`, this.montageFound, this.montageCharacter.id, "found");
  }

  private finishMemory(): void {
    const run = this.memoryRun!;
    if (run.phase === "lost") {
      this.finishGame("TIME UP", `Stage ${run.stageIndex + 1}/${MEMORY_STAGES.length} · ${run.stage.size}×${run.stage.size}\n${run.matchedPairs} / ${run.stage.pairs} pairs found. Try again from 4×4!`, 0);
      return;
    }
    const score = timeScore(run.totalElapsedMs, run.mistakes, 8000);
    this.finishGame("ALL STAGES CLEAR", `You completed all ${MEMORY_STAGES.length} stages!\n${formatTime(run.totalElapsedMs)} · ${run.mistakes} misses · ${score.toLocaleString()} points`, score);
  }

  private finishGame(headline: string, detail: string, score: number, celebrationCharacterId?: string, metric: "score" | "found" = "score"): void {
    if (!this.active) return;
    this.active = false;
    this.stopClock();
    this.game.classList.add("is-input-locked");
    feedback.complete();
    const showResult = (): void => {
      this.resultTitle.textContent = headline;
      this.resultDetail.textContent = detail;
      this.result.classList.remove("hidden");
    };
    if (celebrationCharacterId && metric === "found") {
      this.cheer.playFoundForCharacter(headline, score, "NICE PICK!", celebrationCharacterId, showResult);
    } else if (celebrationCharacterId) {
      this.cheer.playForCharacter(headline, score, "NICE PICK!", celebrationCharacterId, showResult);
    } else {
      this.cheer.play(headline, score, "NICE PICK!", showResult, score);
    }
  }

  private pauseGame(): void {
    if (!this.active || this.paused) return;
    if (this.mode === "memory") this.advanceMemoryClock(performance.now());
    if (!this.active) return;
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
    this.openHelp("How to play", `<div class="rules-list"><p><b>1. Picture Pieces</b><span>Find every piece that belongs to the character on the 7×7 board before the 60-second timer runs out.</span></p><p><b>2. Montage Hunt</b><span>Find the one image that exactly matches the character above. Start with 3×3, move to 4×4 after one match, then stay at 5×5 after two matches. Find as many as you can within one shared 3-minute timer. The character changes after every match.</span></p><p><b>3. Pair Memory</b><span>Clear all four stages: 4×4 (1 min), 5×5 (1 min), 6×6 (1 min 30 sec), and 7×7 (2 min). Each stage starts with a fresh timer after a 3-second face preview. Any two identical faces match. Gray center stars are free spaces. Time up ends the run.</span></p></div>`);
  }

  private showRules(): void {
    this.openHelp("Scoring rules", `<div class="rules-list"><p><b>Picture Pieces</b><span>Up to 10 sec: 1,500 · 20 sec: 1,200 · 30 sec: 900 · 45 sec: 600 · 60 sec: 300 points.</span></p><p><b>Pair Memory</b><span>Finish faster and avoid missed pairs for a higher score.</span></p><p><b>Montage Hunt</b><span>Your result is the number of exact matches found in 3 minutes.</span></p></div>`);
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
