import { describe, expect, it } from "vitest";
import { createMemoryBoard, createMontageBoard, createRandomIndexCycle, createUnitBoard, PICK_MISTAKE_LIMIT, pickChances, tieredTimeScore, timeScore, type SourcePiece } from "./game";

const pieces: SourcePiece[] = Array.from({ length: 75 }, (_, index) => ({ characterId: `c${Math.floor(index / 12)}`, pieceIndex: index, src: `${index}.jpg` }));

describe("TAP to PICK game rules", () => {
  it("puts every target unit into a 7x7 board", () => {
    const board = createUnitBoard("c0", pieces, 49, () => 0.25);
    expect(board).toHaveLength(49);
    expect(board.filter((tile) => tile.target)).toHaveLength(12);
  });

  it("creates one exact montage match", () => {
    const board = createMontageBoard(16, 25, () => 0.5);
    expect(board).toHaveLength(25);
    expect(board.filter((tile) => tile.exact)).toHaveLength(1);
    expect(new Set(board.filter((tile) => !tile.exact).map((tile) => tile.variationIndex))).toEqual(new Set(Array.from({ length: 16 }, (_, index) => index)));
    expect(board.filter((tile) => !tile.exact)).toHaveLength(24);
  });

  it("allows four mistakes and ends on exactly the fifth, with a fresh run restoring five chances", () => {
    expect(PICK_MISTAKE_LIMIT).toBe(5);
    for (let mistakes = 0; mistakes < 5; mistakes++) {
      expect(pickChances(mistakes)).toEqual({ remaining: 5 - mistakes, gameOver: false });
    }
    expect(pickChances(5)).toEqual({ remaining: 0, gameOver: true });
    expect(pickChances(6)).toEqual({ remaining: 0, gameOver: true });
    expect(pickChances(0)).toEqual({ remaining: 5, gameOver: false });
  });

  it("uses every montage character once before starting a new random cycle", () => {
    const firstCycle = createRandomIndexCycle(7, -1, () => 0.25);
    const secondCycle = createRandomIndexCycle(7, firstCycle.at(-1), () => 0.75);

    expect([...firstCycle].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect([...secondCycle].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(secondCycle[0]).not.toBe(firstCycle.at(-1));
    expect(createRandomIndexCycle(7, -1, () => 0)).not.toEqual(createRandomIndexCycle(7, -1, () => 0.999));
  });

  it("creates eight identical face pairs on a 4x4 board", () => {
    const faces = Array.from({ length: 7 }, (_, i) => `face-${i}.webp`);
    const board = createMemoryBoard(faces, 4, () => 0.4);
    expect(board).toHaveLength(16);
    expect(new Set(board.map((card) => card.id)).size).toBe(16);
    const counts = new Map<number, number>();
    board.forEach((card) => {
      expect(faces).toContain(card.src);
      counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
    });
    expect(counts.size).toBe(8);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
    expect(() => createMemoryBoard(Array(7).fill("same.webp"))).toThrow();
  });

  it.each([4, 5, 6, 7] as const)("builds a balanced size-%i memory board with an optional center star", (size) => {
    const faces = Array.from({ length: 7 }, (_, i) => `face-${i}.webp`);
    const board = createMemoryBoard(faces, size, () => 0.4);
    expect(board).toHaveLength(size * size);
    expect(new Set(board.map((card) => card.id)).size).toBe(size * size);
    expect(board.filter((card) => card.free)).toHaveLength(size % 2);
    if (size % 2) expect(board[Math.floor(size * size / 2)]!.free).toBe(true);
    const counts = faces.map((src) => board.filter((card) => card.src === src).length);
    expect(counts.every((count) => count >= 2 && count % 2 === 0)).toBe(true);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
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
});
