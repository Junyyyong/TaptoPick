import { describe, expect, it } from "vitest";
import { createMemoryBoard, createMontageBoard, createUnitBoard, montageScore, tieredTimeScore, timeScore, type SourcePiece } from "./game";

const pieces: SourcePiece[] = Array.from({ length: 75 }, (_, index) => ({ characterId: `c${Math.floor(index / 12)}`, pieceIndex: index, src: `${index}.jpg` }));

describe("TAP to PICK game rules", () => {
  it("puts every target unit into a 7x7 board", () => {
    const board = createUnitBoard("c0", pieces, 49, () => 0.25);
    expect(board).toHaveLength(49);
    expect(board.filter((tile) => tile.target)).toHaveLength(12);
  });

  it("creates one exact montage match", () => {
    const board = createMontageBoard(undefined, () => 0.5);
    expect(board).toHaveLength(25);
    expect(board.filter((tile) => tile.exact)).toHaveLength(1);
    expect(board.filter((tile) => !tile.exact).every((tile) => tile.transform !== "scale(1)" || tile.filter !== "none")).toBe(true);
  });

  it("creates 24 pairs and one center free tile", () => {
    const board = createMemoryBoard(pieces, () => 0.4);
    expect(board).toHaveLength(49);
    expect(board[24]?.free).toBe(true);
    const counts = new Map<number, number>();
    board.filter((card) => !card.free).forEach((card) => counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1));
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
  });

  it("rewards faster, cleaner play", () => {
    expect(timeScore(10_000, 0)).toBeGreaterThan(timeScore(30_000, 0));
    expect(timeScore(10_000, 0)).toBeGreaterThan(timeScore(10_000, 3));
  });

  it("awards one of five picture-piece scores within 60 seconds", () => {
    const bands = [
      { maxMs: 10_000, score: 1500 },
      { maxMs: 20_000, score: 1200 },
      { maxMs: 30_000, score: 900 },
      { maxMs: 45_000, score: 600 },
      { maxMs: 60_000, score: 300 },
    ];
    expect(tieredTimeScore(10_000, bands)).toBe(1500);
    expect(tieredTimeScore(10_001, bands)).toBe(1200);
    expect(tieredTimeScore(20_000, bands)).toBe(1200);
    expect(tieredTimeScore(20_001, bands)).toBe(900);
    expect(tieredTimeScore(30_000, bands)).toBe(900);
    expect(tieredTimeScore(30_001, bands)).toBe(600);
    expect(tieredTimeScore(45_000, bands)).toBe(600);
    expect(tieredTimeScore(45_001, bands)).toBe(300);
    expect(tieredTimeScore(60_000, bands)).toBe(300);
    expect(tieredTimeScore(60_001, bands)).toBe(0);
  });

  it("scores montage finds and deducts wrong picks", () => {
    expect(montageScore(5, 2)).toBe(2450);
    expect(montageScore(0, 4)).toBe(0);
  });
});
