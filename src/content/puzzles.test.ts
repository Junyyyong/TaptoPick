import { describe, expect, it } from "vitest";
import { GAME_IMAGE_URLS, MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS, MONTAGE_CHARACTERS, PICTURE_PIECES_SCORE_BANDS, PICTURE_PIECES_TIME_LIMIT_MS } from "./puzzles";

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

  it("reuses eight preloaded faces including all seven members for memory", () => {
    expect(MEMORY_FACES).toHaveLength(8);
    expect(new Set(MEMORY_FACES).size).toBe(8);
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
