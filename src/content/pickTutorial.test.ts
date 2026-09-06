import { describe, it, expect } from "vitest";
import { PRACTICE_EXAMPLES } from "./pickTutorial";
import { PracticeRun } from "../core/pick/tutorial";

describe("picture pieces tutorial", () => {
  it("contains four distinct correct sample pieces and completes after four taps", () => {
    const example = PRACTICE_EXAMPLES[0]!;
    expect(example.tiles).toHaveLength(9);
    expect(new Set(example.tiles.map(tile => tile.src)).size).toBe(9);
    expect(example.tiles.filter(tile => tile.target)).toHaveLength(4);
    const run = new PracticeRun(example.mode, example.tiles);
    expect(run.pick(run.tiles.findIndex(tile=>!tile.target))).toBe("wrong");
    expect(run.progress).toBe(0);
    for (let i=0;i<4;i++) { expect(run.complete).toBe(false); run.pick(run.nextIndex); }
    expect(run.complete).toBe(true);
  });
});
