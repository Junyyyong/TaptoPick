import { describe, expect, it } from "vitest";
import { GAME_IMAGE_URLS, MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS, MONTAGE_CHARACTERS, PICTURE_PIECES_SCORE_BANDS } from "./puzzles";
import { tieredTimeScore } from "../core/pick/game";

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
      ["haepi", "Haepi", 20],
      ["bbogles", "Bbogles", 20],
      ["tapee", "Tapee", 20],
      ["tepee", "Tepee", 20],
      ["hupi", "Hupi", 18],
      ["jaepi", "Jaepi", 16],
      ["pino", "Pino Pan", 18],
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
    expect(GAME_IMAGE_URLS).toHaveLength(221);
    expect(new Set(GAME_IMAGE_URLS)).toHaveLength(GAME_IMAGE_URLS.length);
    expect(GAME_IMAGE_URLS.every((url) => url.includes(".webp"))).toBe(true);
  });
});
