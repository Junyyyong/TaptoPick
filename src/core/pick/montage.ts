import { PICK_MISTAKE_LIMIT, shuffle, type MontageTile, type Random } from "./game";

export const MONTAGE_STAGES = [
  { side: 2, goal: 3, difficulty: "easy" },
  { side: 3, goal: 5, difficulty: "medium" },
  { side: 4, goal: 5, difficulty: "hard" },
  { side: 5, goal: 5, difficulty: "hard" },
] as const;

export class PickLives {
  remaining = PICK_MISTAKE_LIMIT;
  lose(): void { this.remaining = Math.max(0, this.remaining - 1); }
  restore(): boolean {
    if (this.remaining === 0 || this.remaining === PICK_MISTAKE_LIMIT) return false;
    this.remaining += 1;
    return true;
  }
}

export class MontageProgress {
  found = 0;
  stageIndex = 0;
  stageFound = 0;
  complete = false;
  get stage() { return MONTAGE_STAGES[this.stageIndex]!; }

  correct(lives: PickLives): { bonus: boolean; promoted: boolean } {
    if (this.complete || lives.remaining === 0) return { bonus: false, promoted: false };
    this.found += 1;
    this.stageFound += 1;
    if (this.stageFound < this.stage.goal) return { bonus: false, promoted: false };
    const bonus = this.stageIndex === 1 && lives.restore();
    if (this.stageIndex === MONTAGE_STAGES.length - 1) {
      this.complete = true;
      return { bonus, promoted: false };
    }
    this.stageIndex += 1;
    this.stageFound = 0;
    return { bonus, promoted: true };
  }
}

export function createStagedMontageBoard(
  side: number, variations: readonly number[], random: Random = Math.random,
): MontageTile[] {
  if (!variations.length) throw new Error("Montage needs wrong candidates");
  const pool = shuffle(variations, random);
  return shuffle(Array.from({ length: side * side }, (_, id) => ({
    id, exact: id === 0, variationIndex: id === 0 ? -1 : pool[(id - 1) % pool.length]!,
  })), random);
}

export function reshuffleMontage(tiles: readonly MontageTile[], random: Random = Math.random): MontageTile[] {
  const shuffled = shuffle(tiles, random);
  // Always move the answer, including for deterministic/random no-op shuffles.
  const oldAnswer = tiles.findIndex((tile) => tile.exact);
  const newAnswer = shuffled.findIndex((tile) => tile.exact);
  if (shuffled.length > 1 && oldAnswer === newAnswer) shuffled.push(shuffled.shift()!);
  return shuffled;
}

/** Six seconds to pick, 900 ms warning, 300 ms settling. No time limit. */
export function montageMotion(elapsedMs: number): { phase: "ready" | "warning" | "moving"; revision: number } {
  const position = elapsedMs % 7200;
  return {
    phase: position < 6000 ? "ready" : position < 6900 ? "warning" : "moving",
    revision: Math.floor((elapsedMs + 300) / 7200),
  };
}
