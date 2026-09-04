import { createLetterBoard, inputValueForTile, MIRROR_TRAP_TOKEN, type LetterTile, type MirrorAxis } from "../core/hangul/board";
import { checkSequenceTap, createAlphabetBoard, createRandomAlphabetTargets, type AlphabetTile } from "../core/hangul/alphabetGame";
import { composeTokens } from "../core/hangul/compose";
import { CHEONJIIN_STROKES, CONSONANTS, PUNCTUATION_SYMBOLS, type BoardSymbol } from "../core/hangul/keys";
import { isWordMatch, pickLessonTargets, wordCountLabel } from "../core/hangul/wordChallenge";
import { lessonCheerFor, lessonScoreFromTime } from "../core/hangul/writing";
import { materializeTargetTokens, targetCharacterProgress, targetToTokens } from "../core/hangul/target";
import { ALPHABET_COURSES, SENTENCE_LEVELS, SENTENCE_PROMPTS, WORD_LEVELS, WORD_TARGETS, alphabetTargetNote, type AlphabetLevel, type SentencePrompt, type WordTarget } from "../content/prompts";
import { APP_CONFIG } from "../config/app";
import { el } from "./dom";
import { feedback } from "./feedback";
import { canAcceptInput } from "./inputCapacity";
import { Cheer } from "./screens/cheer";
import { loadSentenceProgress, saveSentenceProgress } from "./sentenceProgress";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = "alphabet" | "sentence" | "word";
interface TypedToken { value: string; tileId?: number }

const formatTime = (ms: number): string => {
  const tenths = Math.floor(ms / 100) % 10;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

/** Nine decorative colours repeat evenly across 81 positions, independently of jamo. */
const boardColorAt = (index: number): number => ((index * 5 + Math.floor(index / 9) * 2) % 9) + 1;

interface TutorialStep {
  title: string;
  body: string;
  keys: readonly string[];
  result: string;
  decoys?: readonly { key: string; mirror: MirrorAxis }[];
}

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { title: "Follow visible progress", body: "Blue jamo are done and red is next. In the game, Retry restarts only the current item. Tap ㄱ, ㄴ, ㄷ, then ㄹ.", keys: ["ㄱ", "ㄴ", "ㄷ", "ㄹ"], result: "ㄱ → ㄴ → ㄷ → ㄹ" },
  { title: "Pick one consonant", body: "The nine colours are mixed. Tap ㅋ once; a used block turns grey.", keys: ["ㅋ"], result: "ㅋ" },
  { title: "Build a syllable", body: "Tap ㅊ, then ㅣ and ㄴ.", keys: ["ㅊ", "ㅣ", "ㄴ"], result: "친" },
  { title: "Make a vowel", body: "Use the square Cheonjiin dot with ㅣ and ㅡ. Tap ㅣ, then ㆍ.", keys: ["ㅣ", "ㆍ"], result: "ㅏ" },
  { title: "Make a compound vowel", body: "Build 개 without a ready-made ㅐ block. Tap ㄱ, ㅣ, ㆍ, then ㅣ.", keys: ["ㄱ", "ㅣ", "ㆍ", "ㅣ"], result: "개" },
  { title: "Add punctuation", body: "Only a small period, !, and ? are used. Tap the period.", keys: ["."], result: "." },
  { title: "Avoid reversed traps", body: "Reversed consonants are traps. Try one, then tap the normal ㅇ.", keys: ["ㅇ"], result: "ㅇ · trap avoided", decoys: [{ key: "ㄱ", mirror: "horizontal" }, { key: "ㅂ", mirror: "vertical" }] },
  { title: "Finish a word", body: "A correct target word is counted automatically.", keys: ["ㅅ", "ㅣ", "ㆍ", "ㄹ", "ㅣ", "ㆍ", "ㅇ"], result: "사랑 · 1 word" },
];

/** Thin UI coordinator. Hangul behavior stays in core/hangul. */
export class TalkApp {
  private readonly cheer = new Cheer();
  private readonly studioSplash = el("screen-studio-splash");
  private readonly splash = el("screen-splash");
  private readonly title = el("screen-title");
  private readonly game = el("screen-game");
  private readonly board = el("letter-board");
  private readonly targetLabel = el("target-label");
  private readonly targetPrompt = document.querySelector<HTMLElement>(".target-prompt")!;
  private readonly targetText = el("target-text");
  private readonly targetHint = el("target-hint");
  private readonly typedText = el("typed-text");
  private readonly clock = el("run-clock");
  private readonly runMode = el("run-mode");
  private readonly result = el("result-layer");
  private readonly resultTitle = el("result-title");
  private readonly resultDetail = el("result-detail");
  private readonly submitRow = el("writing-submit-row");
  private readonly writingFeedback = el("writing-feedback");
  private readonly help = el("help-layer");
  private readonly helpTitle = el("help-title");
  private readonly helpBody = el("help-body");
  private readonly tutorialNav = el("tutorial-nav");
  private readonly tutorialDots = el("tutorial-dots");
  private preferences: TalkPreferences = loadTalkPreferences();
  private sentenceProgress = loadSentenceProgress();
  private tutorialStep = 0;
  private tutorialProgress = 0;
  private tutorialSolved = false;
  private mode: Mode = "sentence";
  private prompt: SentencePrompt = SENTENCE_PROMPTS[0]!;
  private wordTarget: WordTarget = WORD_TARGETS[0]!;
  private wordCount = 0;
  private wordLevel = 0;
  private wordTargetIndex = 0;
  private wordLessonTargets: readonly WordTarget[] = [];
  private sentenceLevel = 0;
  private sentenceIndex = 0;
  private alphabetCourseIndex = 0;
  private alphabetLevelIndex = 0;
  private alphabetTargetIndex = 0;
  private alphabetPartIndex = 0;
  private alphabetTiles: AlphabetTile[] = [];
  private alphabetSequence: readonly string[] = [];
  private alphabetTapGroups: readonly (readonly string[])[] = [];
  private alphabetWrong = false;
  private alphabetTotalMs = 0;
  private alphabetCourseComplete = false;
  private inputLocked = true;
  private paused = false;
  private sentenceTimer?: number;
  private tiles: LetterTile[] = [];
  private used = new Set<number>();
  private input: TypedToken[] = [];
  private startedAt = 0;
  private elapsedMs = 0;
  private frame?: number;

  constructor() {
    el("mode-alphabet").addEventListener("click", () => this.showAlphabetCourses());
    el("mode-sentence").addEventListener("click", () => this.showLevelSelect());
    el("mode-free").addEventListener("click", () => this.showWordLevelSelect());
    el("btn-back").addEventListener("click", () => this.showTitle());
    el("btn-pause").addEventListener("click", () => this.pauseGame());
    this.setupBackspace();
    el("btn-space").addEventListener("click", () => this.typeFixed(" "));
    el("btn-again").addEventListener("click", () => this.continueFromResult());
    el("btn-result-menu").addEventListener("click", () => this.showTitle());
    el("btn-title-tutorial").addEventListener("click", () => this.showTutorial());
    el("btn-title-settings").addEventListener("click", () => this.showSettings());
    el("btn-title-rules").addEventListener("click", () => this.showRules());
    el("btn-help-close").addEventListener("click", () => this.paused ? this.resumeGame() : this.closeHelp());
    el("btn-tutorial-prev").addEventListener("click", () => this.moveTutorial(-1));
    el("btn-tutorial-next").addEventListener("click", () => this.moveTutorial(1));
    document.addEventListener("pointerdown", () => { this.cheer.unlock(); feedback.unlock(); }, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !this.game.classList.contains("hidden")) this.pauseGame();
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
    window.clearTimeout(this.sentenceTimer);
    this.inputLocked = true; this.paused = false;
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.help.classList.add("hidden"); this.studioSplash.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
  }

  private start(mode: Mode, keepLessonTime = false): void {
    window.clearTimeout(this.sentenceTimer);
    this.cheer.stop();
    this.inputLocked = false; this.paused = false;
    this.game.classList.remove("is-input-locked");
    this.targetPrompt.classList.remove("is-writing-complete");
    this.mode = mode;
    if (mode === "alphabet") { this.showAlphabetCourses(); return; }
    if (mode === "sentence") this.prompt = SENTENCE_LEVELS[this.sentenceLevel]!.prompts[this.sentenceIndex]!;
    else this.wordTarget = this.wordLessonTargets[this.wordTargetIndex] ?? WORD_TARGETS[0]!;
    this.input = []; this.used.clear();
    const requiredText = mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    this.tiles = createLetterBoard(requiredText);
    this.targetLabel.textContent = mode === "sentence" ? `${SENTENCE_LEVELS[this.sentenceLevel]!.name} · ${this.sentenceIndex + 1}/5` : `${WORD_LEVELS[this.wordLevel]!.name} · ${this.wordTargetIndex + 1}/3`;
    this.renderTranslatedTarget();
    this.typedText.dataset.empty = mode === "sentence" ? "Your sentence appears here." : "Your word appears here.";
    this.runMode.textContent = mode === "sentence" ? "Sentence Copy" : "Word Challenge";
    this.game.classList.toggle("is-word-mode", mode === "word");
    this.game.classList.remove("is-alphabet-mode");
    this.submitRow.classList.add("hidden");
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.renderBoard(); this.renderInput(); this.startClock(mode === "sentence" && keepLessonTime);
  }

  private renderTranslatedTarget(): void {
    this.targetText.classList.remove("is-medium-sequence", "is-long-sequence");
    if (this.mode === "word") {
      const korean = document.createElement("span"); korean.className = "target-korean"; korean.textContent = this.wordTarget.word;
      const english = document.createElement("span"); english.className = "target-translation-inline"; english.textContent = this.wordTarget.translation;
      this.targetText.replaceChildren(korean, english);
      this.targetHint.textContent = "Complete the target word.";
      return;
    }
    this.targetText.textContent = this.prompt.text;
    this.targetHint.textContent = this.prompt.translation;
  }

  private currentAlphabetLevel(): AlphabetLevel {
    return ALPHABET_COURSES[this.alphabetCourseIndex]!.levels[this.alphabetLevelIndex]!;
  }

  private showAlphabetCourses(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Korean Alphabet");
    this.helpBody.innerHTML = `<p class="level-intro">Choose one course. Its levels must be completed in order.</p><div class="level-list" id="alphabet-course-list"></div>`;
    const list = el("alphabet-course-list");
    ALPHABET_COURSES.forEach((course, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "level-btn alphabet-course-btn";
      button.innerHTML = `<strong>${course.name}</strong><span>${course.description}</span><small>START</small>`;
      button.addEventListener("click", () => this.startAlphabetCourse(index));
      list.append(button);
    });
  }

  private startAlphabetCourse(courseIndex: number): void {
    this.alphabetCourseIndex = courseIndex;
    this.alphabetLevelIndex = 0;
    this.alphabetTotalMs = 0;
    this.alphabetCourseComplete = false;
    this.help.classList.add("hidden");
    this.startAlphabetLevel();
  }

  private startAlphabetLevel(): void {
    window.clearTimeout(this.sentenceTimer);
    this.cheer.stop();
    this.mode = "alphabet";
    this.inputLocked = false; this.paused = false;
    this.game.classList.remove("is-input-locked");
    this.alphabetTargetIndex = 0; this.alphabetPartIndex = 0; this.elapsedMs = 0;
    el("btn-again").textContent = "Play again";
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.game.classList.remove("is-word-mode"); this.game.classList.add("is-alphabet-mode");
    this.submitRow.classList.add("hidden");
    this.loadAlphabetLevel();
    this.startClock();
  }

  private loadAlphabetLevel(): void {
    const course = ALPHABET_COURSES[this.alphabetCourseIndex]!;
    const level = this.currentAlphabetLevel();
    this.alphabetTargetIndex = 0; this.alphabetPartIndex = 0;
    this.alphabetWrong = false;
    this.targetPrompt.classList.remove("is-alphabet-complete");
    this.used.clear();
    this.alphabetSequence = level.randomizeTargets
      ? createRandomAlphabetTargets(level.sequence.map((target) => target.length), level.pool)
      : level.sequence;
    this.alphabetTapGroups = level.randomizeTargets
      ? this.alphabetSequence.map((target) => [...target])
      : level.tapGroups;
    this.alphabetTiles = createAlphabetBoard(this.alphabetTapGroups.flat(), level.pool, 81, Math.random, level.trapChance, level.trapPool);
    this.runMode.textContent = `${course.name} · Lv.${level.number}`;
    this.targetLabel.textContent = `Lv.${level.number} · 1 / ${this.alphabetSequence.length}`;
    this.renderAlphabetBoard();
    this.renderAlphabetProgress();
  }

  private renderAlphabetBoard(): void {
    const fragment = document.createDocumentFragment();
    this.alphabetTiles.forEach((tile, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `letter-tile letter-tile--alphabet letter-tile--color-${boardColorAt(index)}`;
      if (tile.mirror) button.classList.add(`letter-tile--flip-${tile.mirror === "horizontal" ? "x" : "y"}`);
      button.dataset.tileId = String(tile.id);
      button.setAttribute("aria-label", tile.value);
      const glyph = document.createElement("span"); glyph.className = "letter-glyph"; glyph.textContent = tile.value === "ㆍ" || tile.value === "." ? "" : tile.value;
      button.append(glyph);
      if (tile.value === "ㆍ") button.classList.add("letter-tile--cheonjiin-dot");
      if (tile.value === ".") button.classList.add("letter-tile--period");
      button.addEventListener("click", () => this.tapAlphabetTile(tile, button));
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private tapAlphabetTile(tile: AlphabetTile, button: HTMLButtonElement): void {
    if (this.inputLocked || this.paused || this.used.has(tile.id)) return;
    if (tile.mirror) {
      feedback.reject();
      button.classList.remove("is-wrong-pick"); void button.offsetWidth; button.classList.add("is-wrong-pick");
      window.setTimeout(() => button.classList.remove("is-wrong-pick"), 360);
      return;
    }
    const tapGroup = this.alphabetTapGroups[this.alphabetTargetIndex]!;
    const result = checkSequenceTap(tapGroup, this.alphabetPartIndex, tile.value);
    if (!result.correct) {
      feedback.reject();
      this.alphabetWrong = true; this.renderAlphabetProgress();
      button.classList.remove("is-wrong-pick");
      void button.offsetWidth;
      button.classList.add("is-wrong-pick");
      window.setTimeout(() => { button.classList.remove("is-wrong-pick"); this.alphabetWrong = false; this.renderAlphabetProgress(); }, 360);
      return;
    }
    feedback.pick(this.alphabetTargetIndex + result.nextIndex);
    this.used.add(tile.id); button.disabled = true;
    this.alphabetPartIndex = result.nextIndex;
    if (result.complete) {
      this.inputLocked = true;
      this.targetPrompt.classList.add("is-alphabet-complete");
      this.renderAlphabetProgress();
      window.setTimeout(() => {
        this.targetPrompt.classList.remove("is-alphabet-complete");
        this.alphabetTargetIndex += 1; this.alphabetPartIndex = 0;
        if (this.alphabetTargetIndex === this.alphabetSequence.length) this.completeAlphabetLevel();
        else { this.inputLocked = false; this.renderAlphabetProgress(); }
      }, 340);
      return;
    }
    this.renderAlphabetProgress();
  }

  private renderAlphabetProgress(): void {
    const level = this.currentAlphabetLevel();
    const course = ALPHABET_COURSES[this.alphabetCourseIndex]!;
    this.targetLabel.textContent = `Lv.${level.number} · ${Math.min(this.alphabetTargetIndex + 1, this.alphabetSequence.length)} / ${this.alphabetSequence.length}`;
    const target = this.alphabetSequence[this.alphabetTargetIndex] ?? "✓";
    const korean = document.createElement("span"); korean.className = "target-korean"; korean.textContent = target;
    const note = document.createElement("span"); note.className = "alphabet-target-note"; note.textContent = alphabetTargetNote(course.id, target);
    this.targetText.replaceChildren(korean, note);
    const targetLength = target.length;
    this.targetText.classList.toggle("is-medium-sequence", targetLength > 4 && targetLength <= 8);
    this.targetText.classList.toggle("is-long-sequence", targetLength > 8);
    const preview = this.alphabetSequence.slice(this.alphabetTargetIndex, this.alphabetTargetIndex + 6).join(" → ");
    const parts = this.alphabetTapGroups[this.alphabetTargetIndex] ?? [];
    const progress = document.createElement("span"); progress.className = "alphabet-part-progress";
    parts.forEach((part, index) => {
      const glyph = document.createElement("span"); glyph.textContent = part === "ㆍ" ? "" : part;
      glyph.className = index < this.alphabetPartIndex ? "is-done" : index === this.alphabetPartIndex ? "is-current" : "is-pending";
      if (part === "ㆍ") { glyph.classList.add("is-cheonjiin-dot"); glyph.setAttribute("aria-label", "모음천"); }
      if (this.alphabetWrong && index === this.alphabetPartIndex) glyph.classList.add("is-wrong");
      progress.append(glyph);
    });
    const count = document.createElement("small"); count.textContent = `${this.alphabetTargetIndex} / ${this.alphabetSequence.length}`;
    this.typedText.replaceChildren(progress, count);
    this.typedText.dataset.empty = "";
    this.typedText.classList.remove("is-empty", "is-wrong", "is-correct");
    this.targetHint.textContent = `${preview}${this.alphabetTargetIndex + 6 < this.alphabetSequence.length ? " → …" : ""}`;
  }

  private completeAlphabetLevel(): void {
    this.inputLocked = true;
    this.stopClock();
    this.alphabetTotalMs += this.elapsedMs;
    feedback.complete();
    const course = ALPHABET_COURSES[this.alphabetCourseIndex]!;
    if (this.alphabetLevelIndex === course.levels.length - 1) {
      const availableMs = course.levels.reduce((total, level) => total + level.durationMs, 0);
      const remaining = Math.max(0, availableMs - this.alphabetTotalMs);
      const score = Math.max(1, Math.round(1500 * remaining / availableMs));
      this.alphabetCourseComplete = true;
      el("btn-again").textContent = "Play course again";
      this.showResult(`${course.name} complete!`, `Lv.${course.levels[0]!.number}–${course.levels.at(-1)!.number} · ${formatTime(this.alphabetTotalMs)}`, score);
      return;
    }
    this.sentenceTimer = window.setTimeout(() => {
      this.alphabetLevelIndex += 1;
      this.startAlphabetLevel();
    }, 520);
  }

  private finishAlphabetChallenge(): void {
    this.stopClock(); this.inputLocked = true; feedback.fail();
    const level = this.currentAlphabetLevel();
    this.alphabetCourseComplete = false;
    el("btn-again").textContent = "Retry level";
    this.showResult("Time is up!", `Lv.${level.number} · ${this.alphabetTargetIndex} / ${this.alphabetSequence.length}`);
  }

  private renderBoard(): void {
    const fragment = document.createDocumentFragment();
    this.tiles.forEach((tile, index) => {
      const button = document.createElement("button");
      const color = boardColorAt(index);
      button.className = `letter-tile letter-tile--color-${color}`; button.type = "button";
      const glyph = document.createElement("span");
      glyph.className = "letter-glyph";
      glyph.textContent = tile.symbol === "ㆍ" ? "━" : tile.symbol;
      button.append(glyph);
      if (CONSONANTS.includes(tile.symbol as never)) button.classList.add("letter-tile--consonant");
      else if (CHEONJIIN_STROKES.includes(tile.symbol as never)) button.classList.add("letter-tile--vowel");
      else button.classList.add("letter-tile--punctuation");
      if (tile.symbol === "ㆍ") button.classList.add("letter-tile--cheonjiin-dot");
      if (tile.symbol === ".") button.classList.add("letter-tile--period");
      if (tile.mirror) button.classList.add(`letter-tile--flip-${tile.mirror === "horizontal" ? "x" : "y"}`);
      button.dataset.tileId = String(tile.id); button.setAttribute("aria-label", tile.symbol === "ㆍ" ? "Cheonjiin dot" : tile.symbol);
      button.addEventListener("click", () => inputValueForTile(tile) === MIRROR_TRAP_TOKEN ? this.typeTrapTile(tile.id) : this.typeTile(tile.id, tile.symbol)); fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private typeTile(tileId: number, value: BoardSymbol): void {
    if (this.inputLocked || this.paused) return;
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    if (this.used.has(tileId)) return;
    feedback.pick(this.input.length + 1);
    this.used.add(tileId); this.input.push({ value, tileId });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true;
    this.renderInput();
  }
  private typeTrapTile(tileId: number): void {
    if (this.inputLocked || this.paused || this.used.has(tileId)) return;
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    feedback.reject();
    this.used.add(tileId); this.input.push({ value: MIRROR_TRAP_TOKEN, tileId });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true;
    this.renderInput();
  }
  private typeFixed(value: string): void {
    if (this.inputLocked || this.paused) return;
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    feedback.tap(); this.input.push({ value }); this.renderInput();
  }
  private backspace(): void {
    if (this.inputLocked || this.paused) return;
    const removed = this.input.pop();
    if (removed?.tileId !== undefined) {
      this.used.delete(removed.tileId);
      const button = this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${removed.tileId}"]`)!;
      button.disabled = false;
    }
    feedback.tap(); this.renderInput();
  }

  private setupBackspace(): void {
    const button = el<HTMLButtonElement>("btn-backspace");
    let delay: number | undefined;
    let repeat: number | undefined;
    let repeated = false;
    const stop = (): void => {
      if (delay !== undefined) window.clearTimeout(delay);
      if (repeat !== undefined) window.clearInterval(repeat);
      delay = undefined; repeat = undefined;
    };
    button.addEventListener("pointerdown", (event) => {
      repeated = false;
      button.setPointerCapture?.(event.pointerId);
      delay = window.setTimeout(() => {
        repeated = true; this.backspace();
        repeat = window.setInterval(() => this.backspace(), 90);
      }, 420);
    });
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
    button.addEventListener("click", () => {
      if (repeated) { repeated = false; return; }
      this.backspace();
    });
  }

  private renderInput(): void {
    const text = composeTokens(this.input.map((token) => token.value));
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    const expected = materializeTargetTokens(targetToTokens(target));
    const wrongIndex = this.input.findIndex((token, index) => token.value !== expected[index]);
    const targetNodes = targetCharacterProgress(target, this.input.map((token) => token.value)).map(({ character, state }) => {
      const glyph = document.createElement("span"); glyph.className = `target-character is-${state}`; glyph.textContent = character;
      return glyph;
    });
    if (this.mode === "word") {
      const korean = document.createElement("span"); korean.className = "target-korean"; korean.append(...targetNodes);
      const english = document.createElement("span"); english.className = "target-translation-inline"; english.textContent = this.wordTarget.translation;
      this.targetText.replaceChildren(korean, english);
    } else this.targetText.replaceChildren(...targetNodes);
    const composed = document.createElement("span"); composed.className = `composed-input${text ? "" : " is-empty"}`; composed.textContent = text; composed.dataset.empty = this.typedText.dataset.empty;
    const count = document.createElement("small"); count.className = "writing-token-count"; count.textContent = `${Math.min(this.input.length, expected.length)} / ${expected.length}`;
    this.typedText.replaceChildren(composed, count);
    this.typedText.classList.toggle("is-empty", text.length === 0);
    this.typedText.classList.toggle("is-correct", this.input.length > 0 && wrongIndex < 0);
    this.typedText.classList.toggle("is-wrong", wrongIndex >= 0);
    if (this.mode === "sentence" && text === this.prompt.text) this.finishSentence();
    if (this.mode === "word") {
      this.clearWordFeedback();
      if (isWordMatch(text, this.wordTarget.word)) this.completeWord();
    }
  }

  private startClock(resume = false): void {
    this.stopClock();
    this.startedAt = resume ? performance.now() - this.elapsedMs : performance.now();
    const update = (): void => {
      this.elapsedMs = performance.now() - this.startedAt;
      if (this.mode === "word" || this.mode === "alphabet") {
        const duration = this.mode === "word" ? WORD_LEVELS[this.wordLevel]!.durationMs : this.currentAlphabetLevel().durationMs;
        const remaining = Math.max(0, duration - this.elapsedMs); this.clock.textContent = formatTime(remaining);
        if (remaining === 0) {
          if (this.mode === "word") this.finishWordChallenge();
          else this.finishAlphabetChallenge();
          return;
        }
      } else this.clock.textContent = formatTime(this.elapsedMs);
      this.frame = requestAnimationFrame(update);
    };
    update();
  }
  private stopClock(): void { if (this.frame !== undefined) cancelAnimationFrame(this.frame); this.frame = undefined; }
  private finishSentence(): void {
    if (this.frame === undefined || this.inputLocked) return;
    this.inputLocked = true;
    this.game.classList.add("is-input-locked");
    this.targetPrompt.classList.add("is-writing-complete");
    this.stopClock();
    feedback.complete();
    const level = SENTENCE_LEVELS[this.sentenceLevel]!;
    const finalSentence = this.sentenceIndex === level.prompts.length - 1;
    if (finalSentence) {
      const score = lessonScoreFromTime(this.elapsedMs, level.targetMs);
      const previousBest = this.sentenceProgress.bestScores[level.id] ?? 0;
      this.sentenceProgress.bestScores[level.id] = Math.max(previousBest, score);
      saveSentenceProgress(this.sentenceProgress);
      el("btn-again").textContent = "Choose level";
      this.showResult("Level complete!", `${score.toLocaleString()} / 1,500 · ${formatTime(this.elapsedMs)} · Best ${this.sentenceProgress.bestScores[level.id]!.toLocaleString()}`, score);
    } else {
      this.sentenceTimer = window.setTimeout(() => {
        this.targetPrompt.classList.remove("is-writing-complete");
        this.sentenceIndex += 1;
        this.start("sentence", true);
      }, 520);
    }
  }

  private continueFromResult(): void {
    this.result.classList.add("hidden");
    if (this.mode === "sentence") {
      this.showLevelSelect(); return;
    }
    if (this.mode === "alphabet") {
      if (this.alphabetCourseComplete) {
        this.alphabetLevelIndex = 0; this.alphabetTotalMs = 0; this.alphabetCourseComplete = false;
      }
      this.startAlphabetLevel();
    }
    else this.showWordLevelSelect();
  }
  private clearWordFeedback(): void {
    this.writingFeedback.textContent = "";
    this.writingFeedback.classList.remove("needs-work");
    this.submitRow.classList.add("hidden");
  }
  private completeWord(): void {
    this.clearWordFeedback();
    this.inputLocked = true; this.targetPrompt.classList.add("is-writing-complete");
    feedback.clear(this.input.length);
    window.setTimeout(() => {
      this.targetPrompt.classList.remove("is-writing-complete");
      this.wordCount += 1;
      if (this.wordCount === this.wordLessonTargets.length) {
        this.stopClock();
        const level = WORD_LEVELS[this.wordLevel]!;
        const score = lessonScoreFromTime(this.elapsedMs, level.durationMs);
        el("btn-again").textContent = "Choose level";
        this.showResult(`${level.name} complete!`, `3 / 3 words · ${formatTime(this.elapsedMs)}`, score);
        return;
      }
      this.inputLocked = false; this.startNextWord();
    }, 340);
  }
  private startNextWord(): void {
    this.wordTargetIndex += 1;
    this.wordTarget = this.wordLessonTargets[this.wordTargetIndex] ?? WORD_TARGETS[0]!;
    this.input = []; this.used.clear();
    this.tiles = createLetterBoard(this.wordTarget.word);
    this.targetLabel.textContent = `${WORD_LEVELS[this.wordLevel]!.name} · ${this.wordTargetIndex + 1}/3`;
    this.renderTranslatedTarget();
    this.targetHint.textContent = `${wordCountLabel(this.wordCount)} complete · ${3 - this.wordCount} left.`;
    this.renderBoard(); this.renderInput();
  }
  private finishWordChallenge(): void {
    this.stopClock(); this.inputLocked = true;
    el("btn-again").textContent = "Choose level";
    const label = wordCountLabel(this.wordCount);
    if (this.wordCount > 0) {
      feedback.complete();
      const tierScore = this.wordCount >= 10 ? 900 : this.wordCount >= 7 ? 650 : this.wordCount >= 4 ? 350 : 0;
      this.showResult("Time is up!", `${label} completed`, this.wordCount, tierScore);
    } else {
      feedback.fail();
      this.showResult("Time is up!", "0 words completed");
    }
  }

  private showWordLevelSelect(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Word Challenge");
    this.helpBody.innerHTML = `<p class="level-intro">Choose a lesson and complete three Korean words.</p><div class="level-list" id="word-level-list"></div>`;
    const list = el("word-level-list");
    WORD_LEVELS.forEach((level, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "level-btn";
      button.innerHTML = `<strong>${level.name}</strong><span>${level.description}</span><em>3 words · ${Math.round(level.durationMs / 1000)} seconds</em><small>START</small>`;
      button.addEventListener("click", () => this.startWordLevel(index));
      list.append(button);
    });
  }

  private startWordLevel(index: number): void {
    this.wordLevel = index; this.wordTargetIndex = 0; this.wordCount = 0; this.elapsedMs = 0;
    this.wordLessonTargets = pickLessonTargets(WORD_LEVELS[index]!.targets, 3);
    this.help.classList.add("hidden");
    el("btn-again").textContent = "Choose level";
    this.start("word");
  }
  private showResult(title: string, detail: string, score?: number, tierScore = score): void {
    const reveal = (): void => {
      this.resultTitle.textContent = title;
      this.resultDetail.textContent = detail;
      this.result.classList.remove("hidden");
    };
    if (score !== undefined) this.cheer.play(title, score, lessonCheerFor(tierScore ?? score), reveal, tierScore);
    else this.cheer.playFailure(title, "TRY AGAIN!", reveal);
  }

  private openHelp(title: string): void {
    feedback.tap();
    this.helpTitle.textContent = title;
    this.help.classList.remove("hidden");
  }

  private showLevelSelect(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Sentence Copy");
    this.helpBody.innerHTML = `<p class="level-intro">Complete five phrases for up to 1,500 points. Your fastest run becomes the level high score.</p><div class="level-list" id="level-list"></div>`;
    const list = el("level-list");
    SENTENCE_LEVELS.forEach((level, index) => {
      const best = this.sentenceProgress.bestScores[level.id] ?? 0;
      const button = document.createElement("button");
      button.type = "button"; button.className = "level-btn";
      button.innerHTML = `<strong>${level.name}</strong><span>${level.description}</span><em>5 phrases · Top tier ${Math.round(level.targetMs / 1000)}s</em><small>${best ? `BEST ${best.toLocaleString()}` : "NEW"}</small>`;
      button.addEventListener("click", () => this.startSentenceLevel(index));
      list.append(button);
    });
  }

  private startSentenceLevel(index: number): void {
    this.sentenceLevel = index; this.sentenceIndex = 0; this.elapsedMs = 0;
    this.help.classList.add("hidden");
    this.start("sentence");
  }

  private pauseGame(): void {
    if (this.inputLocked || this.paused || this.game.classList.contains("hidden")) return;
    this.paused = true; this.stopClock();
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Paused");
    this.helpBody.innerHTML = `<div class="pause-card"><p>Take a break. The clock is stopped.</p><button class="wood-btn" id="btn-resume">Resume</button><button class="text-btn" id="btn-pause-menu">Main menu</button></div>`;
    el("btn-resume").addEventListener("click", () => this.resumeGame());
    el("btn-pause-menu").addEventListener("click", () => this.showTitle());
  }

  private resumeGame(): void {
    if (!this.paused) return;
    this.paused = false; this.help.classList.add("hidden");
    this.startClock(true);
    feedback.tap();
  }

  private closeHelp(): void {
    feedback.tap();
    this.help.classList.add("hidden");
  }

  private showTutorial(): void {
    this.tutorialStep = 0;
    this.tutorialProgress = 0;
    this.tutorialSolved = false;
    this.tutorialNav.classList.remove("hidden");
    this.openHelp("How to play");
    this.renderTutorial();
  }

  private renderTutorial(): void {
    const step = TUTORIAL_STEPS[this.tutorialStep]!;
    this.helpBody.innerHTML = `<article class="tutorial-card"><p class="help-kicker">STEP ${this.tutorialStep + 1} / ${TUTORIAL_STEPS.length}</p><h3>${step.title}</h3><p>${step.body}</p><div class="tutorial-practice"><p class="tutorial-output is-empty" id="tutorial-output" aria-live="polite"></p><div class="tutorial-keys" id="tutorial-keys"></div></div></article>`;
    const keys = el("tutorial-keys");
    [...new Set(step.keys)].forEach((key) => {
      const button = document.createElement("button");
      button.type = "button";
      const category = PUNCTUATION_SYMBOLS.includes(key as never) ? "feature" : ["ㅣ", "ㅡ", "ㆍ"].includes(key) ? "vowel" : "consonant";
      button.className = `tutorial-key tutorial-key--${category}`;
      button.dataset.tutorialKey = key;
      const glyph = document.createElement("span");
      glyph.className = "tutorial-glyph";
      glyph.textContent = key;
      button.append(glyph);
      if (key === ".") button.classList.add("tutorial-key--period");
      button.addEventListener("click", () => this.playTutorialKey(key));
      keys.append(button);
    });
    step.decoys?.forEach(({ key, mirror }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tutorial-key tutorial-key--consonant tutorial-key--flip-${mirror === "horizontal" ? "x" : "y"}`;
      button.dataset.tutorialDecoy = key;
      const glyph = document.createElement("span");
      glyph.className = "tutorial-glyph"; glyph.textContent = key;
      button.append(glyph);
      button.addEventListener("click", () => {
        feedback.reject();
        button.disabled = true; button.classList.add("is-used");
        const output = el("tutorial-output");
        output.textContent = "× Trap! Choose the normal block.";
        output.classList.remove("is-empty");
      });
      keys.prepend(button);
    });
    this.updateTutorialKeys();
    this.tutorialDots.replaceChildren(...TUTORIAL_STEPS.map((_, index) => {
      const dot = document.createElement("span");
      dot.className = `dot${index === this.tutorialStep ? " now" : index < this.tutorialStep ? " done" : ""}`;
      return dot;
    }));
    el<HTMLButtonElement>("btn-tutorial-prev").disabled = this.tutorialStep === 0;
    el<HTMLButtonElement>("btn-tutorial-next").disabled = !this.tutorialSolved;
    el("btn-tutorial-next").textContent = this.tutorialStep === TUTORIAL_STEPS.length - 1 ? "Start" : "Next";
  }

  private playTutorialKey(key: string): void {
    const step = TUTORIAL_STEPS[this.tutorialStep]!;
    if (key !== step.keys[this.tutorialProgress]) {
      feedback.reject();
      el("tutorial-output").textContent = "Tap the glowing key.";
      return;
    }
    feedback.tap();
    this.tutorialProgress += 1;
    const entered = step.keys.slice(0, this.tutorialProgress);
    let output = entered.join(" → ");
    if (this.tutorialProgress === step.keys.length) {
      this.tutorialSolved = true;
      output = step.result;
      feedback.complete();
      el<HTMLButtonElement>("btn-tutorial-next").disabled = false;
    }
    const outputEl = el("tutorial-output");
    outputEl.textContent = output;
    outputEl.classList.toggle("is-empty", !output);
    this.updateTutorialKeys();
  }

  private updateTutorialKeys(): void {
    const step = TUTORIAL_STEPS[this.tutorialStep]!;
    this.helpBody.querySelectorAll<HTMLButtonElement>("[data-tutorial-key]").forEach((button) => {
      const key = button.dataset.tutorialKey;
      const usedBefore = step.keys.slice(0, this.tutorialProgress).includes(key as never);
      const neededAgain = step.keys.slice(this.tutorialProgress).includes(key as never);
      const used = usedBefore && !neededAgain;
      button.disabled = used;
      button.classList.toggle("is-used", used);
      button.classList.toggle("is-next", !this.tutorialSolved && key === step.keys[this.tutorialProgress]);
    });
  }

  private moveTutorial(direction: number): void {
    feedback.tap();
    if (direction > 0 && this.tutorialStep === TUTORIAL_STEPS.length - 1) {
      this.preferences.tutorialDone = true;
      saveTalkPreferences(this.preferences);
      this.closeHelp();
      return;
    }
    this.tutorialStep = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, this.tutorialStep + direction));
    this.tutorialProgress = 0;
    this.tutorialSolved = false;
    this.renderTutorial();
  }

  private showRules(): void {
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Rules");
    this.helpBody.innerHTML = `<div class="rules-list"><p><b>Korean Alphabet</b><span>Choose Consonants, Vowels, or Syllables. Each course starts at its first level and every level must be completed in order.</span></p><p><b>Sound guide</b><span>Simple IPA shows how each jamo sounds. A slash such as [k] / [ɡ] separates sounds used in different positions.</span></p><p><b>Visible progress</b><span>Blue jamo are complete, red is the next tap, and a completed target turns blue.</span></p><p><b>Sentence Copy</b><span>Complete five phrases. The full run is worth up to 1,500 points and your best score is saved.</span></p><p><b>Word Challenge</b><span>Choose one of five lessons and complete three words before its timer ends.</span></p><p><b>Nine mixed colours</b><span>Colours do not belong to a particular letter. A used block turns grey.</span></p><p><b>Vowels</b><span>Use ㆍ, ㅡ, and ㅣ for simple and compound vowels. Symbol traps are mixed into the board.</span></p><p><b>Syllables</b><span>Build useful one-syllable words about people, the body, daily life, nature, and more.</span></p><p><b>Reversed traps</b><span>Mirrored consonants are traps from Lv.1. They never count as the original consonant.</span></p></div>`;
  }

  private showSettings(): void {
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Settings");
    const canVibrate = typeof navigator.vibrate === "function";
    this.helpBody.innerHTML = `<div class="switch-list"><button class="switch-row" id="talk-sound"><span class="switch-text"><b>Sound</b><small>Button sounds and finish sounds</small></span><span class="switch" role="switch" aria-checked="${this.preferences.soundOn}"><span class="switch-knob"></span></span></button><button class="switch-row" id="talk-haptics"><span class="switch-text"><b>Vibration</b><small>Short feedback when you tap</small></span><span class="switch" role="switch" aria-checked="${this.preferences.hapticsOn}"><span class="switch-knob"></span></span></button>${canVibrate ? "" : '<p class="settings-note">Vibration may not work in this browser.</p>'}</div>`;
    el("talk-sound").addEventListener("click", () => this.changePreference("soundOn"));
    el("talk-haptics").addEventListener("click", () => this.changePreference("hapticsOn"));
  }

  private changePreference(key: "soundOn" | "hapticsOn"): void {
    this.preferences[key] = !this.preferences[key];
    saveTalkPreferences(this.preferences);
    this.applyPreferences();
    this.showSettings();
    feedback.item();
  }

  private applyPreferences(): void {
    feedback.setSound(this.preferences.soundOn);
    feedback.setHaptics(this.preferences.hapticsOn);
    this.cheer.setSound(this.preferences.soundOn);
  }
}
