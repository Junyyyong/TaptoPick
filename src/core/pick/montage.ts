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

export function planMontageSwap(tiles: readonly MontageTile[], random: Random = Math.random): { tiles: MontageTile[]; ids: number[] } {
  const first = Math.floor(random() * tiles.length);
  const selected = tiles[first];
  const candidates = tiles.map((tile, index) => ({ tile, index })).filter(({tile, index}) => index !== first &&
    (tile.exact !== selected?.exact || tile.variationIndex !== selected?.variationIndex));
  if (!selected || !candidates.length) return { tiles: [...tiles], ids: [] };
  const second = candidates[Math.floor(random() * candidates.length)]!.index;
  const swapped = [...tiles];
  [swapped[first], swapped[second]] = [swapped[second]!, swapped[first]!];
  return { tiles: swapped, ids: [selected.id, tiles[second]!.id] };
}

/** Only the selected pair closes (360 ms), swaps fully covered (120 ms), then opens (360 ms). */
export function montageMotion(elapsedMs: number): { phase: "ready" | "closing" | "closed" | "opening"; cycle: number; closure: number } {
  const position = elapsedMs % 6840;
  const cycle = Math.floor(elapsedMs / 6840);
  if (position < 6000) return { phase: "ready", cycle, closure: 0 };
  if (position < 6360) return { phase: "closing", cycle, closure: (position - 6000) / 360 };
  if (position < 6480) return { phase: "closed", cycle, closure: 1 };
  return { phase: "opening", cycle, closure: (6840 - position) / 360 };
}
