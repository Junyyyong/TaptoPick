import { APP_CONFIG } from "../config/app";
import { ALL_PIECES, PUZZLE_CHARACTERS, type PuzzleCharacter } from "../content/puzzles";
import { createMemoryBoard, createMontageBoard, createUnitBoard, montageScore, timeScore, type MemoryCard } from "../core/pick/game";
import { el } from "./dom";
import { feedback } from "./feedback";
import { Cheer } from "./screens/cheer";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = "unit" | "montage" | "memory";

const MONTAGE_LIMIT_MS = 60_000;

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
  private readonly targetLabel = el("target-label");
  private readonly targetName = el("target-name");
  private readonly targetHint = el("target-hint");
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

    if (mode === "unit") this.startUnitRound();
    if (mode === "montage") this.startMontageRound();
    if (mode === "memory") this.startMemoryRound();
    this.startClock();
  }

  private startUnitRound(): void {
    this.targetCharacter = PUZZLE_CHARACTERS[Math.floor(Math.random() * PUZZLE_CHARACTERS.length)]!;
    const tiles = createUnitBoard(this.targetCharacter.id, ALL_PIECES);
    this.setBoardSize(7);
    this.runMode.textContent = "조각 찾기";
    this.targetLabel.textContent = "WHOLE PICTURE";
    this.targetName.textContent = this.targetCharacter.name;
    this.targetHint.textContent = "완성 그림에 속한 조각을 모두 찾으세요.";
    this.gameNote.textContent = "오답 없이 빠르게 찾을수록 높은 점수를 얻어요.";
    this.renderCharacterPreview(this.targetCharacter);
    this.updateProgress(0, this.targetCharacter.pieces.length, `0 / ${this.targetCharacter.pieces.length} 조각`);

    const fragment = document.createDocumentFragment();
    tiles.forEach((tile) => {
      const button = this.imageButton(tile.src, `${tile.characterId} 이미지 조각`);
      button.addEventListener("click", () => {
        if (!this.active || this.paused || this.unitFound.has(tile.id)) return;
        if (!tile.target) {
          this.mistakes += 1;
          feedback.reject();
          this.flashWrong(button);
          return;
        }
        this.unitFound.add(tile.id);
        button.classList.add("is-found");
        button.disabled = true;
        feedback.pick(this.unitFound.size);
        this.updateProgress(this.unitFound.size, this.targetCharacter.pieces.length, `${this.unitFound.size} / ${this.targetCharacter.pieces.length} 조각`);
        if (this.unitFound.size === this.targetCharacter.pieces.length) this.finishUnit();
      });
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private startMontageRound(): void {
    this.setBoardSize(9);
    this.runMode.textContent = "몽타주 찾기";
    this.targetLabel.textContent = "MONTAGE";
    this.targetHint.textContent = "81명 중 몽타주와 완전히 같은 한 명을 찾으세요.";
    this.gameNote.textContent = "제한 시간 60초 · 찾을 때마다 새 몽타주가 나와요.";
    this.renderNextMontage();
  }

  private renderNextMontage(): void {
    this.targetCharacter = PUZZLE_CHARACTERS[Math.floor(Math.random() * PUZZLE_CHARACTERS.length)]!;
    this.targetName.textContent = `${this.targetCharacter.name} 몽타주`;
    this.renderCharacterPreview(this.targetCharacter);
    this.updateProgress(this.montageFound, Math.max(1, this.montageFound + 1), `${this.montageFound}명 발견`);

    const fragment = document.createDocumentFragment();
    createMontageBoard(this.targetCharacter.id).forEach((tile) => {
      const button = this.montageButton(this.targetCharacter, tile.transform, tile.filter);
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
    this.runMode.textContent = "페어 메모리";
    this.targetLabel.textContent = "MEMORY";
    this.targetName.textContent = "같은 그림 찾기";
    this.targetHint.textContent = "두 장씩 뒤집어 같은 이미지 조각을 맞추세요.";
    this.gameNote.textContent = "가운데 별은 보너스 칸이에요. 나머지 48장에는 24쌍이 있어요.";
    this.targetPreview.replaceChildren();
    const badge = document.createElement("div");
    badge.className = "memory-target-badge";
    badge.innerHTML = "<strong>24</strong><span>PAIRS</span>";
    this.targetPreview.append(badge);
    this.memoryCards = createMemoryBoard(ALL_PIECES);
    this.updateProgress(0, 24, "0 / 24 페어");
    this.renderMemoryBoard();
  }

  private renderMemoryBoard(): void {
    const fragment = document.createDocumentFragment();
    this.memoryCards.forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picture-tile memory-card";
      button.setAttribute("aria-label", card.free ? "보너스 칸" : "뒤집힌 이미지 카드");
      if (card.free) {
        button.classList.add("is-free", "is-matched");
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
      this.updateProgress(this.memoryMatched.size, 24, `${this.memoryMatched.size} / 24 페어`);
      this.renderMemoryBoard();
      if (this.memoryMatched.size === 24) this.finishMemory();
    }, matched ? 360 : 720);
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

  private montageButton(character: PuzzleCharacter, transform: string, filter: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picture-tile";
    button.setAttribute("aria-label", `${character.name} 몽타주 후보`);
    let visual: HTMLElement;
    if (character.preview) {
      const image = document.createElement("img");
      image.src = character.preview;
      image.alt = "";
      visual = image;
    } else {
      const composite = document.createElement("span");
      composite.className = "montage-composite";
      character.pieces.forEach((src) => {
        const image = document.createElement("img");
        image.src = src;
        image.alt = "";
        composite.append(image);
      });
      visual = composite;
    }
    visual.style.transform = transform;
    visual.style.filter = filter;
    button.append(visual);
    return button;
  }

  private renderCharacterPreview(character: PuzzleCharacter): void {
    if (character.preview) {
      this.renderImagePreview(character.preview, `${character.name} 완성 이미지`);
      return;
    }
    const grid = document.createElement("div");
    grid.className = `assembled-preview assembled-preview--${character.pieces.length}`;
    character.pieces.forEach((src) => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      grid.append(image);
    });
    grid.setAttribute("aria-label", `${character.name} 완성 이미지`);
    this.targetPreview.replaceChildren(grid);
  }

  private renderImagePreview(src: string, alt: string): void {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    this.targetPreview.replaceChildren(image);
  }

  private setBoardSize(size: 7 | 9): void {
    this.board.classList.toggle("picture-board--7", size === 7);
    this.board.classList.toggle("picture-board--9", size === 9);
    this.board.classList.toggle("is-montage", size === 9);
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
      if (this.mode === "montage") {
        const remaining = Math.max(0, MONTAGE_LIMIT_MS - this.elapsedMs);
        this.clock.textContent = formatTime(remaining);
        this.progressFill.style.width = `${remaining / MONTAGE_LIMIT_MS * 100}%`;
        if (remaining <= 0) { this.finishMontage(); return; }
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
    const score = timeScore(this.elapsedMs, this.mistakes);
    this.finishGame("PUZZLE COMPLETE", `${this.targetCharacter.name}의 모든 조각을 찾았습니다.\n${formatTime(this.elapsedMs)} · 오답 ${this.mistakes}회 · ${score.toLocaleString()}점`, score);
  }

  private finishMontage(): void {
    const score = montageScore(this.montageFound, this.mistakes);
    this.finishGame("TIME UP", `60초 동안 ${this.montageFound}명을 찾았습니다.\n오답 ${this.mistakes}회 · ${score.toLocaleString()}점`, score);
  }

  private finishMemory(): void {
    const score = timeScore(this.elapsedMs, this.mistakes, 8000);
    this.finishGame("ALL PAIRS FOUND", `24쌍을 모두 맞췄습니다.\n${formatTime(this.elapsedMs)} · 실패 ${this.mistakes}회 · ${score.toLocaleString()}점`, score);
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
    this.openHelp("일시정지", "<div class=pause-copy><strong>잠시 쉬어가도 좋아요.</strong><p>닫기 버튼을 누르면 타이머가 이어서 시작됩니다.</p></div>");
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
    this.openHelp("게임 방법", `<div class="rules-list"><p><b>1. 조각 찾기</b><span>위의 완성 이미지를 보고 7×7 보드에서 그 캐릭터를 이루는 모든 조각을 찾습니다.</span></p><p><b>2. 몽타주 찾기</b><span>위에 제시된 몽타주와 완전히 같은 이미지를 9×9 후보 중 찾습니다. 제한 시간은 60초입니다.</span></p><p><b>3. 페어 메모리</b><span>7×7 카드를 두 장씩 뒤집어 같은 이미지 24쌍을 모두 맞춥니다. 중앙 별은 보너스 칸입니다.</span></p></div>`);
  }

  private showRules(): void {
    this.openHelp("점수 규칙", `<div class="rules-list"><p><b>빠른 발견</b><span>조각 찾기와 페어 메모리는 완료 시간이 짧을수록 점수가 높습니다.</span></p><p><b>정확한 선택</b><span>틀린 조각이나 서로 다른 페어를 고르면 점수가 줄어듭니다.</span></p><p><b>60초 도전</b><span>몽타주는 정답 1명당 500점이며 오답 1회당 25점이 감점됩니다.</span></p></div>`);
  }

  private showSettings(): void {
    this.openHelp("설정", `<div class="switch-list"><button class="switch-row" data-setting="sound"><span class="switch-text"><b>효과음</b><small>선택과 성공 소리를 재생합니다.</small></span><span class="switch" role="switch" aria-checked="${this.preferences.soundOn}"><i class="switch-knob"></i></span></button><button class="switch-row" data-setting="haptics"><span class="switch-text"><b>진동</b><small>지원하는 기기에서 터치 진동을 사용합니다.</small></span><span class="switch" role="switch" aria-checked="${this.preferences.hapticsOn}"><i class="switch-knob"></i></span></button></div>`);
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
