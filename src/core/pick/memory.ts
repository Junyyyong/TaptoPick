import { createMemoryBoard, type MemoryCard, type Random } from "./game";

export const MEMORY_STAGES = [
  { size: 4, pairs: 8, limitMs: 60_000 },
  { size: 5, pairs: 12, limitMs: 60_000 },
  { size: 6, pairs: 18, limitMs: 90_000 },
  { size: 7, pairs: 24, limitMs: 120_000 },
] as const;

type Phase = "preview" | "playing" | "resolving" | "won" | "lost";
type PickResult = "ignored" | "first" | "match" | "mismatch";

/** Pure game state. The UI advances time only while the game is unpaused. */
export class MemoryRun {
  stageIndex = 0;
  phase: Phase = "preview";
  cards: MemoryCard[] = [];
  readonly matchedIds = new Set<number>();
  readonly openIds = new Set<number>();
  elapsedMs = 0;
  totalElapsedMs = 0;
  mistakes = 0;
  previewRemainingMs: number;
  private resolveRemainingMs = 0;

  constructor(
    private readonly faces: readonly string[],
    private readonly previewMs: number,
    private readonly revealMs: { readonly match: number; readonly mismatch: number },
    private readonly random: Random = Math.random,
  ) {
    this.previewRemainingMs = previewMs;
    this.cards = createMemoryBoard(faces, this.stage.size, random);
  }

  get stage() { return MEMORY_STAGES[this.stageIndex]!; }
  get matchedPairs(): number { return this.matchedIds.size / 2; }
  get remainingMs(): number { return Math.max(0, this.stage.limitMs - this.elapsedMs); }

  choose(id: number): PickResult {
    if (this.phase !== "playing" || this.remainingMs <= 0 || this.openIds.has(id) || this.matchedIds.has(id)) return "ignored";
    const card = this.cards.find((entry) => entry.id === id);
    if (!card || card.free) return "ignored";
    this.openIds.add(id);
    if (this.openIds.size === 1) return "first";
    const open = this.cards.filter((entry) => this.openIds.has(entry.id));
    // Repeated faces are interchangeable, regardless of their original pair IDs.
    const match = open[0]!.src === open[1]!.src;
    if (match) open.forEach((entry) => this.matchedIds.add(entry.id));
    else this.mistakes += 1;
    this.phase = "resolving";
    this.resolveRemainingMs = match ? this.revealMs.match : this.revealMs.mismatch;
    return match ? "match" : "mismatch";
  }

  advance(deltaMs: number): void {
    if (deltaMs <= 0 || !Number.isFinite(deltaMs) || this.phase === "won" || this.phase === "lost") return;
    if (this.phase === "preview") {
      this.previewRemainingMs = Math.max(0, this.previewRemainingMs - deltaMs);
      if (this.previewRemainingMs === 0) this.phase = "playing";
      return;
    }

    // A final matching pick made before the deadline clears the stage;
    // its short reveal animation must not cause a last-moment timeout.
    const cleared = this.matchedPairs === this.stage.pairs;
    if (!cleared) {
      const spent = Math.min(deltaMs, this.remainingMs);
      this.elapsedMs += spent;
      this.totalElapsedMs += spent;
      if (this.remainingMs === 0) {
        this.phase = "lost";
        return;
      }
    }
    if (this.phase !== "resolving") return;
    this.resolveRemainingMs = Math.max(0, this.resolveRemainingMs - deltaMs);
    if (this.resolveRemainingMs > 0) return;
    this.openIds.clear();
    if (!cleared) {
      this.phase = "playing";
      return;
    }
    if (this.stageIndex === MEMORY_STAGES.length - 1) {
      this.phase = "won";
      return;
    }
    this.stageIndex += 1;
    this.elapsedMs = 0;
    this.previewRemainingMs = this.previewMs;
    this.matchedIds.clear();
    this.cards = createMemoryBoard(this.faces, this.stage.size, this.random);
    this.phase = "preview";
  }
}
