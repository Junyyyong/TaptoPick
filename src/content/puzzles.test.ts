import { describe, expect, it } from "vitest";
import { MEMORY_REVEAL_DELAY_MS, MONTAGE_JAEPI, PICTURE_PIECES_SCORE_BANDS, PICTURE_PIECES_TIME_LIMIT_MS } from "./puzzles";

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

  it("keeps memory reveals readable without a long input lock", () => {
    expect(MEMORY_REVEAL_DELAY_MS).toEqual({ match: 250, mismatch: 450 });
  });

  it("provides one Jaepi answer and 16 distinct wrong variations", () => {
    expect(MONTAGE_JAEPI.name).toBe("Jaepi");
    expect(MONTAGE_JAEPI.answer).toMatch(/answer.*\.webp/);
    expect(MONTAGE_JAEPI.variations).toHaveLength(16);
    expect(new Set(MONTAGE_JAEPI.variations)).toHaveLength(16);
    expect(MONTAGE_JAEPI.variations).not.toContain(MONTAGE_JAEPI.answer);
  });
});
