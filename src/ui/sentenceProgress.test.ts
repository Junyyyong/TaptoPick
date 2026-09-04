import { describe, expect, it, vi } from "vitest";
import { loadSentenceProgress, saveSentenceProgress } from "./sentenceProgress";

describe("Sentence Copy progress", () => {
  it("loads defaults and saves best scores", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    expect(loadSentenceProgress()).toEqual({ unlockedLevel: 0, bestScores: {} });
    saveSentenceProgress({ unlockedLevel: 2, bestScores: { "level-1": 4321 } });
    expect(loadSentenceProgress()).toEqual({ unlockedLevel: 2, bestScores: { "level-1": 1500 } });
    vi.unstubAllGlobals();
  });
});
