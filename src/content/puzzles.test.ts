import { describe, expect, it } from "vitest";
import { GAME_IMAGE_URLS, MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS, MONTAGE_CHARACTERS, PICTURE_PIECES_SCORE_BANDS } from "./puzzles";
import { tieredTimeScore } from "../core/pick/game";
import { createStagedMontageBoard } from "../core/pick/montage";

describe("Picture Pieces scoring content", () => {
  it("keeps five score bands without a completion deadline", () => {
    expect(PICTURE_PIECES_SCORE_BANDS).toEqual([
      { maxMs: 10_000, score: 1500 },
      { maxMs: 20_000, score: 1200 },
      { maxMs: 30_000, score: 900 },
      { maxMs: 45_000, score: 600 },
      { maxMs: Infinity, score: 300 },
    ]);
    expect(tieredTimeScore(600_000, PICTURE_PIECES_SCORE_BANDS)).toBe(300);
  });

  it("keeps memory reveals readable without a long input lock", () => {
    expect(MEMORY_REVEAL_DELAY_MS).toEqual({ match: 250, mismatch: 450 });
  });

  it("uses only the seven preloaded original faces for memory, with no variations", () => {
    expect(MEMORY_FACES).toHaveLength(7);
    expect(new Set(MEMORY_FACES).size).toBe(7);
    expect(MEMORY_FACES).toEqual(MONTAGE_CHARACTERS.map((character) => character.answer));
    expect(MEMORY_FACES.every((face) => !face.includes("variation"))).toBe(true);
    expect(MEMORY_PREVIEW_MS).toBe(3_000);
    MONTAGE_CHARACTERS.forEach((character) => expect(MEMORY_FACES).toContain(character.answer));
    MEMORY_FACES.forEach((face) => expect(GAME_IMAGE_URLS).toContain(face));
  });

  it("provides answer and distinct wrong variations for each montage character", () => {
    expect(MONTAGE_CHARACTERS.map((character) => [character.id, character.name, character.variations.length])).toEqual([
      ["haepi", "Haepi", 19],
      ["bbogles", "Bbogles", 19],
      ["tapee", "Tapee", 18],
      ["tepee", "Tepee", 19],
      ["hupi", "Hupi", 18],
      ["jaepi", "Jaepi", 15],
      ["pino", "Pino Pan", 16],
    ]);
    MONTAGE_CHARACTERS.forEach((character) => {
      expect(character.easyVariations.length).toBeGreaterThanOrEqual(3);
      expect(character.hardVariations.length).toBeGreaterThanOrEqual(5);
      expect(character.easyVariations.every((index) => !character.hardVariations.includes(index))).toBe(true);
      expect([...character.easyVariations, ...character.hardVariations].every((index) => index >= 0 && index < character.variations.length)).toBe(true);
      expect(character.answer).toMatch(/answer.*\.webp/);
      expect(new Set(character.variations)).toHaveLength(character.variations.length);
      expect(character.variations).not.toContain(character.answer);
      expect([character.answer, ...character.variations].every((url) => url.includes(`/optimized/montage/${character.id}/`))).toBe(true);
    });
  });

  it("exposes every active game image once for splash-screen preloading", () => {
    expect(GAME_IMAGE_URLS).toHaveLength(213);
    expect(new Set(GAME_IMAGE_URLS)).toHaveLength(GAME_IMAGE_URLS.length);
    expect(GAME_IMAGE_URLS.every((url) => url.includes(".webp"))).toBe(true);
  });

  it("excludes the eight approved back views and upside-down faces from every stage and preload", () => {
    const excluded: Record<string, number[]> = { haepi:[23], bbogles:[15], tapee:[1,17], tepee:[20], hupi:[], jaepi:[11], pino:[1,17] };
    for (const character of MONTAGE_CHARACTERS) {
      const forbidden = (url: string) => url.includes(`/montage/${character.id}/`) && excluded[character.id]!.includes(Number(url.match(/variation-(\d+)\.webp/)?.[1]));
      expect(character.variations.some(forbidden)).toBe(false);
      expect(GAME_IMAGE_URLS.some(forbidden)).toBe(false);
      for (const pool of [character.easyVariations, character.variations.map((_, i) => i), character.hardVariations]) {
        for (const side of [2,3,4,5]) {
          const board = createStagedMontageBoard(side, pool, () => 0.42);
          expect(board.filter(tile => tile.exact)).toHaveLength(1);
          expect(board.filter(tile => !tile.exact).every(tile => !forbidden(character.variations[tile.variationIndex]!))).toBe(true);
        }
      }
    }
  });

  it("uses visually reviewed shape changes for all seven introductory 2x2 pools", () => {
    const shapes: Record<string, number[]> = {
      haepi:[16,17,20,22,27], bbogles:[1,8,11,19], tapee:[7,10,13,14,18,19,20],
      tepee:[6,7,11,12,14,15,18], hupi:[10,12,13,16], jaepi:[5,6,14,15], pino:[9,10,12,16],
    };
    for (const character of MONTAGE_CHARACTERS) {
      const numbers = character.easyVariations.map(index => Number(character.variations[index]!.match(/variation-(\d+)\.webp/)?.[1]));
      expect(numbers).toEqual(shapes[character.id]);
      const board = createStagedMontageBoard(2, character.easyVariations, () => 0.42);
      expect(board).toHaveLength(4);
      expect(board.filter(tile => tile.exact)).toHaveLength(1);
      expect(new Set(board.filter(tile => !tile.exact).map(tile => tile.variationIndex)).size).toBe(3);
    }
  });
});
