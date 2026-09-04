import { describe, expect, it } from "vitest";
import { PICTURE_PIECES_SCORE_BANDS, PICTURE_PIECES_TIME_LIMIT_MS } from "./puzzles";

describe("Picture Pieces scoring content", () => {
  it("defines five score bands ending at 60 seconds", () => {
    expect(PICTURE_PIECES_TIME_LIMIT_MS).toBe(60_000);
    expect(PICTURE_PIECES_SCORE_BANDS).toEqual([
      { maxMs: 10_000, score: 1500 },
      { maxMs: 20_000, score: 1200 },
      { maxMs: 30_000, score: 900 },
      { maxMs: 45_000, score: 600 },
      { maxMs: 60_000, score: 300 },
    ]);
  });
});
