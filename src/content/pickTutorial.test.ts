import { describe, it, expect } from "vitest";
import { PRACTICE_EXAMPLES } from "./pickTutorial";
import { PracticeRun } from "../core/pick/tutorial";

describe("picture pieces tutorial", () => {
  it("contains four distinct correct sample pieces and completes after four taps", () => {
    const example = PRACTICE_EXAMPLES[0]!;
    expect(example.tiles).toHaveLength(4);
    expect(new Set(example.tiles.map(tile => tile.src)).size).toBe(4);
    expect(example.tiles.every(tile => tile.target)).toBe(true);
    const run = new PracticeRun(example.mode, example.tiles);
    for (let i=0;i<4;i++) { expect(run.complete).toBe(false); run.pick(run.nextIndex); }
    expect(run.complete).toBe(true);
  });
});
