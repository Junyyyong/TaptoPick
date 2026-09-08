import { APP_CONFIG } from "../config/app";
import { ALL_PIECES, MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS, MONTAGE_CHARACTERS, PICTURE_PIECES_SCORE_BANDS, PUZZLE_CHARACTERS, type MontageCharacter, type PuzzleCharacter } from "../content/puzzles";
import { createRandomIndexCycle, createUnitBoard, PICK_MISTAKE_LIMIT, tieredTimeScore, timeScore, type MemoryCard, type MontageTile } from "../core/pick/game";
import { MontageProgress, PickLives, createStagedMontageBoard, montageMotion, planMontageSwap } from "../core/pick/montage";
import { MEMORY_STAGES, MemoryRun } from "../core/pick/memory";
import { el } from "./dom";
import { mountPickTutorial } from "./pickTutorial";
import { feedback } from "./feedback";
import { Cheer } from "./screens/cheer";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";
import { SceneMusic } from "./sceneMusic";
import type { MusicPlaybackState } from "./backgroundMusic";
import { savePickResult, type RunSummary } from "./pickRecords";
import { renderPickResult } from "./pickResultView";
import "./styles/pickExperience.css";

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
  private readonly music: SceneMusic;
  private readonly studioSplash = el("screen-studio-splash");
  private readonly splash = el("screen-splash");
  private readonly title = el("screen-title");
  private readonly musicPrompt = el<HTMLButtonElement>("btn-title-music");
  private readonly game = el("screen-game");
  private readonly board = el("picture-board");
  private readonly clock = el("run-clock");
  private readonly hearts = el("run-lives");
  private readonly damageFlash = el("damage-flash");
  private readonly montageStatus = el("montage-status");
  private readonly runMode = el("run-mode");
  private readonly targetPreview = el("target-preview");
  private readonly targetCharacterName = el("target-character-name");
  private readonly progressLabel = el("progress-label");
  private readonly progressFill = el("progress-fill");
  private readonly result = el("result-layer");
  private readonly resultTitle = el("result-title");
  private readonly moment = el("pick-moment");
  private readonly help = el("help-layer");
  private readonly helpTitle = el("help-title");
  private readonly helpBody = el("help-body");

  private preferences: TalkPreferences = loadTalkPreferences();
  private menuMusicState: MusicPlaybackState = "idle";
  private mode: Mode = "unit";
  private active = false;
  private disposePractice?: () => void;
  private paused = false;
  private startedAt = 0;
  private elapsedMs = 0;
  private frame?: number;
  private mistakes = 0;
  private streak = 0;
  private outcomeTimer?: ReturnType<typeof setTimeout>;
  private momentTimer?: ReturnType<typeof setTimeout>;
  private pendingVideo?: () => void;
  private runVersion = 0;
  private memoryStageHoldRemaining = 0;
  private targetCharacter = PUZZLE_CHARACTERS[0]!;
  private montageCharacter: MontageCharacter = MONTAGE_CHARACTERS[0]!;
  private montageCharacterIndex = -1;
  private montageCharacterCycle: number[] = [];
  private unitFound = new Set<number>();
  private lives = new PickLives();
  private montage = new MontageProgress();
  private montageTiles: MontageTile[] = [];
  private readonly montageButtons = new Map<number, HTMLButtonElement>();
  private montageRoundAt = 0;
  private montageSwapCycle = -1;
  private montageSwap?: ReturnType<typeof planMontageSwap>;
  private montageSwapApplied = false;
  private montageMotionPhase = "ready";
  private montagePointerVersion = 0;
  private montageNoticeUntil = 0;
  private montageNextAt?: number;
  private memoryRun?: MemoryRun;
  private memoryUpdatedAt = 0;
  private readonly memoryButtons = new Map<number, HTMLButtonElement>();

  constructor() {
    this.music = new SceneMusic({
      menu: APP_CONFIG.assets.menuMusic,
      game: APP_CONFIG.assets.backgroundMusic,
    }, undefined, (scene, state) => {
      this.menuMusicState = scene === "menu" ? state : "idle";
      this.updateMusicPrompt();
    });
    this.helpBody.addEventListener("practice-done", () => this.closeHelp());
    this.damageFlash.addEventListener("animationend", () => {
      this.damageFlash.classList.remove("is-active");
      this.game.classList.remove("is-hit");
    });
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
    this.musicPrompt.addEventListener("click", () => this.music.unlock());
    document.addEventListener("pointerdown", () => { this.cheer.unlock(); feedback.unlock(); this.music.unlock(); }, { capture: true });
    // Touch browsers grant activation on release/click, not always pointerdown.
    document.addEventListener("pointerup", () => this.music.unlock(), { capture: true });
    document.addEventListener("click", () => this.music.unlock(), { capture: true });
    document.addEventListener("keydown", () => { feedback.unlock(); this.music.unlock(); }, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.active && !this.paused) this.pauseGame();
      this.updateMusicScene();
      this.cheer.setHidden(document.hidden);
      if (!document.hidden && this.pendingVideo) { const play = this.pendingVideo; this.pendingVideo = undefined; play(); }
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
    this.clearPresentation();
    this.music.setScene("silent");
    this.disposePractice?.();
    this.active = false;
    this.paused = false;
    this.stopClock();
    this.game.classList.remove("is-hit");
    this.damageFlash.classList.remove("is-active");
    this.cheer.stop();
    this.help.classList.add("hidden");
    this.result.classList.add("hidden");
    this.studioSplash.classList.add("hidden");
    this.splash.classList.add("hidden");
    this.game.classList.add("hidden");
    this.title.classList.remove("hidden");
    this.updateMusicScene();
  }

  private startMode(mode: Mode): void {
    this.clearPresentation();
    this.streak = 0;
    feedback.resetCombo();
    this.memoryStageHoldRemaining = 0;
    this.disposePractice?.();
    this.mode = mode;
    this.active = true;
    this.paused = false;
    this.elapsedMs = 0;
    this.mistakes = 0;
    this.unitFound.clear();
    this.lives = new PickLives();
    this.montage = new MontageProgress();
    this.montageNoticeUntil = 0;
    this.montageNextAt = undefined;
    this.memoryRun = undefined;
    this.memoryButtons.clear();
    this.cheer.stop();
    this.result.classList.add("hidden");
    this.help.classList.add("hidden");
    this.title.classList.add("hidden");
    this.splash.classList.add("hidden");
    this.game.classList.remove("hidden", "is-input-locked");
    this.game.classList.remove("is-hit");
    this.damageFlash.classList.remove("is-active");
    this.clock.classList.toggle("hidden", mode !== "memory");
    this.hearts.classList.toggle("hidden", mode === "memory");
    if (mode === "memory") this.hearts.replaceChildren();
    this.montageStatus.classList.toggle("hidden", mode !== "montage");
    this.game.classList.toggle("is-memory-mode", mode === "memory");
    this.game.classList.toggle("is-unit-mode", mode === "unit");
    this.game.classList.toggle("has-character-name", mode !== "memory");
    this.targetCharacterName.classList.toggle("hidden", mode === "memory");
    this.targetCharacterName.textContent = "";
    if (mode !== "memory") this.updateChances();

    if (mode === "unit") this.startUnitRound();
    if (mode === "montage") this.startMontageRound();
    if (mode === "memory") this.startMemoryRound();
    this.startClock();
    this.updateMusicScene();
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
        if (!this.active || this.paused || (tile.target && this.unitFound.has(tile.pieceIndex))) return;
        if (!tile.target) {
          this.flashWrong(button);
          this.wrongPick();
          return;
        }
        this.unitFound.add(tile.pieceIndex);
        this.revealUnitPiece(tile.pieceIndex);
        button.classList.add("is-found");
        button.disabled = true;
        this.correctPick([button]);
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
    this.montageRoundAt = this.elapsedMs;
    this.montageSwapCycle = -1;
    this.montageSwap = undefined;
    this.montageSwapApplied = false;
    this.montageMotionPhase = "ready";
    this.montagePointerVersion += 1;
    if (!this.montageCharacterCycle.length) {
      this.montageCharacterCycle = createRandomIndexCycle(MONTAGE_CHARACTERS.length, this.montageCharacterIndex);
    }
    this.montageCharacterIndex = this.montageCharacterCycle.shift()!;
    this.montageCharacter = MONTAGE_CHARACTERS[this.montageCharacterIndex]!;
    const stage = this.montage.stage;
    const pool = stage.difficulty === "easy" ? this.montageCharacter.easyVariations
      : stage.difficulty === "hard" ? this.montageCharacter.hardVariations
      : this.montageCharacter.variations.map((_, index) => index);
    this.montageTiles = createStagedMontageBoard(stage.side, pool);
    this.setBoardSize(stage.side, true);
    this.targetCharacterName.textContent = this.montageCharacter.displayName;
    this.renderImagePreview(this.montageCharacter.answer, `${this.montageCharacter.displayName} exact montage`);
    this.updateMontageProgress();
    this.updateMontageStatus();

    const fragment = document.createDocumentFragment();
    this.montageButtons.clear();
    this.montageTiles.forEach((tile) => {
      const src = tile.exact ? this.montageCharacter.answer : this.montageCharacter.variations[tile.variationIndex]!;
      const button = this.montageButton(src, this.montageCharacter.name);
      for (const side of ["left", "right"]) {
        const door = document.createElement("span");
        door.className = `swap-door swap-door--${side}`;
        door.setAttribute("aria-hidden", "true");
        button.append(door);
      }
      this.montageButtons.set(tile.id, button);
      let pressedVersion = -1;
      button.addEventListener("pointerdown", () => { pressedVersion = this.montagePointerVersion; });
      button.addEventListener("click", (event) => {
        if (!this.active || this.paused || this.montageNextAt !== undefined || this.montageMotionPhase !== "ready") return;
        if (event.detail !== 0 && pressedVersion !== this.montagePointerVersion) return;
        this.elapsedMs = performance.now() - this.startedAt;
        if (!tile.exact) {
          this.flashWrong(button);
          this.wrongPick();
          return;
        }
        const result = this.montage.correct(this.lives);
        if (result.bonus) {
          this.updateChances("gain");
          this.montageNoticeUntil = this.elapsedMs + 2000;
          this.montageStatus.textContent = "+1 HEART!";
        }
        this.montageNextAt = this.elapsedMs + (result.promoted ? 850 : 200);
        this.correctPick([button]);
        if (result.promoted) this.stageMoment(result.bonus ? "STAGE CLEAR · +1 HEART" : "STAGE CLEAR");
        button.classList.add("is-found");
        this.progressLabel.textContent = `${this.montage.found} found`;
      });
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private updateMontageProgress(): void {
    this.updateProgress(this.montage.stageFound, this.montage.stage.goal, `${this.montage.stageFound}/${this.montage.stage.goal} · ${this.montage.found} found`);
  }

  private updateMontageStatus(): void {
    this.montageStatus.textContent = this.elapsedMs < this.montageNoticeUntil ? "+1 HEART!"
      : this.montageMotionPhase !== "ready" ? "TWO TILES ARE SWAPPING…"
      : `STAGE ${this.montage.stageIndex + 1}/4 · ${this.montage.stage.side}×${this.montage.stage.side}`;
  }

  private updateMontageMotion(): void {
    if (this.montageNextAt !== undefined) return;
    if (this.montageNoticeUntil && this.elapsedMs >= this.montageNoticeUntil) {
      this.montageNoticeUntil = 0;
      this.updateMontageStatus();
    }
    if (this.montage.stage.side !== 5) return;
    const motion = montageMotion(this.elapsedMs - this.montageRoundAt);
    if (motion.phase === "ready" && this.montageMotionPhase === "ready") return;
    if (motion.phase !== "ready" && motion.cycle !== this.montageSwapCycle) {
      this.montageSwapCycle = motion.cycle;
      this.montageSwap = planMontageSwap(this.montageTiles);
      this.montageSwapApplied = false;
      this.montagePointerVersion += 1;
    }
    if ((motion.phase === "closed" || motion.phase === "opening") && this.montageSwap && !this.montageSwapApplied) {
      this.montageSwapApplied = true;
      this.montageTiles = this.montageSwap.tiles;
      this.board.append(...this.montageTiles.map((tile) => this.montageButtons.get(tile.id)!));
    }
    this.montageButtons.forEach((button, id) => {
      const covered = motion.phase !== "ready" && !!this.montageSwap?.ids.includes(id);
      button.classList.toggle("is-swap-door", covered);
      if (covered) button.style.setProperty("--door-close", String(motion.closure));
    });
    if (motion.phase === this.montageMotionPhase) return;
    this.montageMotionPhase = motion.phase;
    this.montageButtons.forEach((button) => { button.disabled = motion.phase !== "ready"; });
    this.updateMontageStatus();
  }

  private startMemoryRound(): void {
    this.memoryRun = new MemoryRun(MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS);
    this.runMode.textContent = "Pair Memory";
    this.renderMemoryStage();
  }

  private renderMemoryStage(): void {
    this.board.classList.remove("is-stage-clear");
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
    if (pick === "first") feedback.tap();
    if (pick === "match") {
      const run = this.memoryRun!;
      this.correctPick([...run.openIds].map(id => this.memoryButtons.get(id)!));
      if (run.matchedPairs === run.stage.pairs) {
        this.memoryStageHoldRemaining = 750;
        if (run.stageIndex < MEMORY_STAGES.length - 1) this.stageMoment("STAGE CLEAR");
      }
    }
    if (pick === "mismatch") { this.streak = 0; feedback.reject(); }
    this.updateMemoryBoard();
  }

  private advanceMemoryClock(now: number): void {
    const run = this.memoryRun!;
    const phase = run.phase;
    const stage = run.stageIndex;
    const delta = now - this.memoryUpdatedAt;
    this.memoryUpdatedAt = now;
    if (this.memoryStageHoldRemaining > 0) {
      this.memoryStageHoldRemaining = Math.max(0, this.memoryStageHoldRemaining - delta);
      if (this.memoryStageHoldRemaining > 0) return;
      // Only hold an already cleared board; never spend the next stage's time.
      run.advance(MEMORY_REVEAL_DELAY_MS.match);
    } else run.advance(delta);
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
    this.targetCharacterName.textContent = character.displayName;
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

  private setBoardSize(size: 2 | 3 | 4 | 5 | 6 | 7 | 9, montage = false): void {
    this.board.classList.toggle("picture-board--2", size === 2);
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
      if (this.mode === "montage") {
        if (this.montageNextAt !== undefined && this.elapsedMs >= this.montageNextAt) {
          if (this.montage.complete) this.finishGame("ALL STAGES CLEAR", `You cleared all 4 stages and found ${this.montage.found} matches!`, this.montage.found, this.montageCharacter.id, "found");
          else this.renderNextMontage();
        }
        if (this.active) this.updateMontageMotion();
      }
      if (this.active) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopClock(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  private finishUnit(): void {
    this.elapsedMs = performance.now() - this.startedAt;
    const score = tieredTimeScore(this.elapsedMs, PICTURE_PIECES_SCORE_BANDS);
    this.finishGame("PUZZLE COMPLETE", `You found every ${this.targetCharacter.name} piece.\n${formatTime(this.elapsedMs)} · ${this.mistakes} wrong picks · ${score.toLocaleString()} points`, score, this.targetCharacter.id);
  }

  private updateChances(effect?: "loss" | "gain"): void {
    this.hearts.setAttribute("aria-label", `${this.lives.remaining} of ${PICK_MISTAKE_LIMIT} lives remaining`);
    this.hearts.innerHTML = Array.from({ length: PICK_MISTAKE_LIMIT }, (_, index) => {
      const changed = effect === "loss" ? index === this.lives.remaining : effect === "gain" && index === this.lives.remaining - 1;
      return `<span class="life-heart${index >= this.lives.remaining ? " is-empty" : ""}${changed ? ` heart-${effect}` : ""}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21S2 14.5 2 7.8C2 2 9 1 12 6c3-5 10-4 10 1.8C22 14.5 12 21 12 21Z"/></svg></span>`;
    }).join("");
  }

  private wrongPick(): void {
    this.streak = 0;
    this.mistakes += 1;
    this.lives.lose();
    feedback.reject();
    this.updateChances("loss");
    // One soft warning per hit; repeated rapid hits do not restart the screen flash.
    if (!this.damageFlash.classList.contains("is-active")) {
      this.game.classList.add("is-hit");
      this.damageFlash.classList.add("is-active");
    }
    if (this.lives.remaining > 0) return;
    this.montageNextAt = undefined;
    if (this.mode === "montage") {
      this.finishGame("GAME OVER", `You found ${this.montage.found} exact matches.\nNo hearts remaining.`, this.montage.found, this.montageCharacter.id, "found");
    } else {
      this.finishGame("GAME OVER", `You found ${this.unitFound.size} of ${this.targetCharacter.pieces.length} ${this.targetCharacter.name} pieces.\nAll ${PICK_MISTAKE_LIMIT} chances used.`, 0, "tepee");
    }
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
    this.music.setScene("silent");
    const won = headline !== "GAME OVER" && headline !== "TIME UP";
    if (won) feedback.complete(); else feedback.fail();
    const memory = this.memoryRun;
    const summary: RunSummary = {
      mode: this.mode, won, score,
      elapsedMs: this.mode === "memory" ? memory!.totalElapsedMs : this.elapsedMs,
      mistakes: this.mode === "memory" ? memory!.mistakes : this.mistakes,
      found: this.mode === "unit" ? this.unitFound.size : this.mode === "montage" ? this.montage.found : memory!.matchedPairs,
      total: this.mode === "unit" ? this.targetCharacter.pieces.length : this.mode === "montage" ? 18 : memory!.stage.pairs,
      stage: this.mode === "montage" ? this.montage.stageIndex + 1 : this.mode === "memory" ? memory!.stageIndex + 1 : 1,
      characterId: this.mode === "unit" ? this.targetCharacter.id : celebrationCharacterId,
    };
    const record = savePickResult(summary);
    const version = this.runVersion;
    const showResult = (): void => {
      if (version !== this.runVersion) return;
      this.resultTitle.textContent = headline;
      renderPickResult(record);
      this.result.setAttribute("aria-label", detail);
      this.result.classList.remove("hidden");
      el("btn-again").focus();
    };
    const video = (): void => {
      if (version !== this.runVersion) return;
      if (document.hidden) { this.pendingVideo = video; return; }
      this.cheer.playOutcome(headline, metric === "found" ? 1000 : score, showResult, celebrationCharacterId, won);
    };
    if (won) {
      this.game.classList.add("is-complete-moment");
      this.moment.textContent = this.mode === "unit" ? "PICTURE COMPLETE" : "ALL STAGES CLEAR";
      this.moment.classList.add("is-visible");
      this.outcomeTimer = setTimeout(video, 1100);
    } else video();
  }

  private correctPick(buttons: HTMLButtonElement[]): void {
    this.streak++;
    feedback.correct(this.streak);
    buttons.forEach(button => {
      button.classList.remove("is-pick-hit");
      void button.offsetWidth;
      button.classList.add("is-pick-hit");
    });
  }

  private stageMoment(text: string): void {
    feedback.complete();
    this.board.classList.add("is-stage-clear");
    this.moment.textContent = text;
    this.moment.classList.add("is-visible");
    clearTimeout(this.momentTimer);
    this.momentTimer = setTimeout(() => {
      this.board.classList.remove("is-stage-clear");
      if (!this.game.classList.contains("is-complete-moment")) this.moment.classList.remove("is-visible");
    }, 750);
  }

  private clearPresentation(): void {
    this.runVersion++;
    clearTimeout(this.outcomeTimer);
    clearTimeout(this.momentTimer);
    this.pendingVideo = undefined;
    this.moment.classList.remove("is-visible");
    this.board.classList.remove("is-stage-clear");
    this.game.classList.remove("is-complete-moment");
  }

  private pauseGame(): void {
    if (!this.active || this.paused) return;
    if (this.mode === "memory") this.advanceMemoryClock(performance.now());
    if (!this.active) return;
    this.paused = true;
    this.music.setScene("silent");
    this.stopClock();
    this.game.classList.add("is-input-locked");
    this.openHelp("Paused", `<div class="pause-card"><p>Take a break. Your game is paused.</p><button class="wood-btn" id="btn-resume">Resume</button><button class="text-btn" id="btn-pause-menu">Main menu</button></div>`);
    el("btn-resume").addEventListener("click", () => this.closeHelp());
    el("btn-pause-menu").addEventListener("click", () => this.showTitle());
    const music = document.createElement("button");
    music.className = "text-btn";
    music.id = "btn-pause-music";
    const label = (): void => { music.textContent = `Music: ${this.preferences.musicOn ? "On" : "Off"}`; music.setAttribute("aria-pressed", String(this.preferences.musicOn)); };
    label();
    music.addEventListener("click", () => {
      this.preferences.musicOn = !this.preferences.musicOn;
      saveTalkPreferences(this.preferences);
      this.applyPreferences();
      label();
    });
    this.helpBody.querySelector(".pause-card")!.append(music);
  }

  private closeHelp(): void {
    this.disposePractice?.();
    this.help.classList.add("hidden");
    this.updateMusicPrompt();
    if (this.paused && this.active) {
      this.paused = false;
      this.game.classList.remove("is-input-locked");
      this.startClock();
      this.updateMusicScene();
    }
  }

  private openHelp(title: string, html: string): void {
    this.disposePractice?.();
    this.helpTitle.textContent = title;
    this.helpBody.innerHTML = html;
    this.help.classList.remove("hidden");
    this.updateMusicPrompt();
  }

  private showHowToPlay(): void {
    this.openHelp("How to play", "");
    this.disposePractice = mountPickTutorial(this.helpBody);
  }

  private showRules(): void {
    this.openHelp("Scoring rules", `<div class="rules-list"><p><b>Picture Pieces</b><span>Up to 10 sec: 1,500 · 20 sec: 1,200 · 30 sec: 900 · 45 sec: 600 · longer: 300 points. No time limit. Game Over after 5 wrong picks: 0 points.</span></p><p><b>Pair Memory</b><span>Finish faster and avoid missed pairs for a higher score.</span></p><p><b>Montage Hunt</b><span>Your result is the number of exact matches found. Clear all 18 to win. Completing 3×3 restores one heart, up to 5; an unused bonus is not saved. No time limit.</span></p></div>`);
  }

  private showSettings(): void {
    this.openHelp("Settings", `<div class="switch-list"><button class="switch-row" data-setting="sound"><span class="switch-text"><b>Sound effects</b><small>Play sounds for picks and completed games.</small></span><span class="switch" role="switch" aria-checked="${this.preferences.soundOn}"><i class="switch-knob"></i></span></button><button class="switch-row" data-setting="haptics"><span class="switch-text"><b>Haptics</b><small>Use touch feedback on supported devices.</small></span><span class="switch" role="switch" aria-checked="${this.preferences.hapticsOn}"><i class="switch-knob"></i></span></button></div>`);
    const musicRow = document.createElement("button");
    musicRow.className = "switch-row";
    musicRow.dataset.setting = "music";
    musicRow.innerHTML = `<span class="switch-text"><b>Background music</b><small>Different tunes for the menu and games.</small></span><span class="switch" role="switch" aria-checked="${this.preferences.musicOn}"><i class="switch-knob"></i></span>`;
    this.helpBody.querySelector(".switch-list")!.append(musicRow);
    this.helpBody.querySelectorAll<HTMLButtonElement>("[data-setting]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.setting === "sound") this.preferences.soundOn = !this.preferences.soundOn;
        if (button.dataset.setting === "haptics") this.preferences.hapticsOn = !this.preferences.hapticsOn;
        if (button.dataset.setting === "music") this.preferences.musicOn = !this.preferences.musicOn;
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
    this.music.setEnabled(this.preferences.musicOn);
    this.updateMusicPrompt();
  }

  private updateMusicScene(): void {
    this.music.setScene(document.hidden ? "silent"
      : this.active && !this.paused ? "game"
      : !this.title.classList.contains("hidden") ? "menu" : "silent");
    this.updateMusicPrompt();
  }

  private updateMusicPrompt(): void {
    const show = this.menuMusicState === "blocked" && this.preferences.musicOn
      && !document.hidden && !this.title.classList.contains("hidden")
      && this.help.classList.contains("hidden");
    if (!show && document.activeElement === this.musicPrompt) {
      // Do not strand keyboard focus on a control hidden by successful playback.
      el("title-heading").focus({ preventScroll: true });
    }
    this.musicPrompt.classList.toggle("hidden", !show);
  }
}
