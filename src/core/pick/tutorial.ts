import { shuffle, type Random } from "./game";

export type PracticeMode = "unit" | "montage" | "memory";
export interface PracticeTile { src: string; key: string; target: boolean }
export class PracticeRun {
  readonly tiles: PracticeTile[];
  readonly matched = new Set<number>();
  open: number[] = [];
  progress = 0;
  readonly goal: number;
  constructor(readonly mode: PracticeMode, tiles: readonly PracticeTile[], random: Random = Math.random) {
    this.tiles = shuffle(tiles, random);
    this.goal = mode === "memory" ? tiles.length / 2 : tiles.filter(t => t.target).length;
  }
  get complete(): boolean { return this.progress === this.goal; }
  pick(index: number): "ignored" | "wrong" | "first" | "mismatch" | "correct" {
    const tile = this.tiles[index];
    if (!tile || this.complete || this.matched.has(index) || this.open.includes(index) || this.open.length === 2) return "ignored";
    if (this.mode !== "memory") {
      if (!tile.target) return "wrong";
      this.matched.add(index); this.progress++;
      return "correct";
    }
    this.open.push(index);
    if (this.open.length === 1) return "first";
    if (this.tiles[this.open[0]!]!.key !== tile.key) return "mismatch";
    this.open.forEach(i => this.matched.add(i)); this.open = []; this.progress++;
    return "correct";
  }
  hideMismatch(): void { if (this.open.length === 2) this.open = []; }
}
