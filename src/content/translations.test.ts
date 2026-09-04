import { describe, expect, it } from "vitest";
import { SENTENCE_LEVELS, SENTENCE_PROMPTS, WORD_LEVELS, WORD_TARGETS } from "./prompts";

describe("Korean prompt translations", () => {
  it("gives every word and sentence one concise English translation", () => {
    for (const target of WORD_TARGETS) expect(target.translation.trim().length).toBeGreaterThan(0);
    for (const prompt of SENTENCE_PROMPTS) expect(prompt.translation.trim().length).toBeGreaterThan(0);
  });

  it("keeps word translations short enough for the inline target", () => {
    for (const target of WORD_TARGETS) expect(target.translation.length).toBeLessThanOrEqual(16);
  });

  it("offers five three-word lesson pools and starts sentences with phrases", () => {
    expect(WORD_LEVELS).toHaveLength(5);
    expect(WORD_LEVELS.every((level) => level.targets.length >= 3)).toBe(true);
    expect(SENTENCE_LEVELS).toHaveLength(6);
    expect(SENTENCE_LEVELS[0]!.prompts[0]!.text).toBe("안녕!");
  });
});
