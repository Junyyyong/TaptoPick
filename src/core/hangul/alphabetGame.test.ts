import { describe, expect, it } from "vitest";
import { ALPHABET_COURSES, alphabetTargetNote } from "../../content/prompts";
import { checkSequenceTap, createAlphabetBoard, createRandomAlphabetTargets, decomposeAlphabetTarget } from "./alphabetGame";

describe("Korean Alphabet courses", () => {
  it("offers three sequential courses with five syllable levels", () => {
    expect(ALPHABET_COURSES.map((course) => course.id)).toEqual(["consonants", "vowels", "syllables"]);
    expect(ALPHABET_COURSES.map((course) => course.levels.length)).toEqual([3, 4, 5]);
    expect(ALPHABET_COURSES.flatMap((course) => course.levels.map((level) => level.number))).toEqual([1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    for (const course of ALPHABET_COURSES) {
      for (const level of course.levels) {
        expect(level.sequence.length).toBeGreaterThan(0);
        expect(level.tapGroups).toHaveLength(level.sequence.length);
        expect(level.tapGroups.flat().length).toBeLessThanOrEqual(81);
      }
    }
  });

  it("uses concise IPA values for jamo and meanings only for syllables", () => {
    expect(alphabetTargetNote("consonants", "ㄱㄴ")).toBe("[k] / [ɡ] · [n]");
    expect(alphabetTargetNote("consonants", "ㄹ")).toBe("[ɾ] / [l]");
    expect(alphabetTargetNote("consonants", "ㅇ")).toBe("∅ / [ŋ]");
    expect(alphabetTargetNote("vowels", "ㅏㅑ")).toBe("[a] · [ja]");
    expect(alphabetTargetNote("syllables", "산")).toBe("mountain");
    expect(alphabetTargetNote("syllables", "나")).toBe("I");
    expect(alphabetTargetNote("syllables", "닭")).toBe("chicken");
  });

  it("splits the full consonant order into targets of at most five jamo", () => {
    const [basic, strokes] = ALPHABET_COURSES[0]!.levels;
    expect(basic!.durationMs).toBe(60_000);
    expect(basic!.sequence).toEqual(["ㄱㄴㄷㄹㅁ", "ㅂㅅㅇㅈㅊ", "ㅋㅌㅍㅎ"]);
    expect(basic!.sequence.join("")).toBe("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ");
    expect(strokes!.durationMs).toBe(75_000);
    expect(strokes!.sequence).toEqual(["ㄱㅋ", "ㄴㄷㄹ", "ㅁㅂㅍ", "ㅅㅈㅊ", "ㅇㅎ"]);
  });

  it("keeps the remaining randomized consonant review at five jamo or fewer", () => {
    const [, , short] = ALPHABET_COURSES[0]!.levels;
    expect(short!.sequence.map((target) => target.length)).toEqual([3, 4, 5]);
    expect(short!.randomizeTargets).toBe(true);
    const targets = createRandomAlphabetTargets([3, 4], ["ㄱ", "ㄴ", "ㄷ", "ㄹ"], () => 0);
    expect(targets.map((target) => target.length)).toEqual([3, 4]);
    expect(targets.every((target) => new Set(target).size === target.length)).toBe(true);
  });

  it("never displays more than five jamo in one alphabet target", () => {
    for (const course of ALPHABET_COURSES) {
      for (const level of course.levels) {
        for (const target of level.sequence) expect([...target].length).toBeLessThanOrEqual(5);
      }
    }
  });

  it("adds mirrored traps from the first consonant level", () => {
    const consonants = ALPHABET_COURSES[0]!;
    expect(consonants.levels.map((level) => level.trapChance)).toEqual([.15, .18, .20]);
    expect(consonants.levels[1]!.trapChance).toBeGreaterThan(consonants.levels[0]!.trapChance);
    const board = createAlphabetBoard(["ㄱ"], ["ㄱ"], 81, () => 0.42, 1);
    expect(board.filter((tile) => tile.required).every((tile) => !tile.mirror)).toBe(true);
    expect(board.some((tile) => tile.mirror === "horizontal")).toBe(true);
  });

  it("builds every vowel level using only Cheonjiin strokes", () => {
    ALPHABET_COURSES[1]!.levels.forEach((level) => {
      expect(level.sequence).toHaveLength(4);
      expect(level.pool).toEqual(["ㆍ", "ㅡ", "ㅣ"]);
      expect(level.trapChance).toBe(.10);
      expect(level.trapPool).toEqual(["╱", "^", "!", "@"]);
      for (const tap of level.tapGroups.flat()) expect(["ㆍ", "ㅡ", "ㅣ"]).toContain(tap);
    });
    expect(ALPHABET_COURSES[1]!.levels[0]!.tapGroups[0]).toEqual(["ㅣ", "ㆍ"]);
    expect(ALPHABET_COURSES[1]!.levels[1]!.tapGroups[0]).toEqual(["ㅣ", "ㆍ", "ㆍ"]);
  });

  it("distributes the four vowel trap symbols evenly when selected", () => {
    const values = [0, 0, 0, 0, 0, .25, 0, 0, .5, 0, 0, .75];
    let index = 0;
    const board = createAlphabetBoard(["ㅣ"], ["ㆍ", "ㅡ", "ㅣ"], 9, () => values[index++ % values.length]!, 1, ["╱", "^", "!", "@"]);
    const traps = board.filter((tile) => ["╱", "^", "!", "@"].includes(tile.value));
    expect(traps).toHaveLength(8);
    expect(Object.fromEntries(["╱", "^", "!", "@"].map((symbol) => [symbol, traps.filter((tile) => tile.value === symbol).length]))).toEqual({ "╱": 2, "^": 2, "!": 2, "@": 2 });
  });

  it("decomposes displayed syllables into jamo-only boards", () => {
    expect(decomposeAlphabetTarget("가")).toEqual(["ㄱ", "ㅏ"]);
    expect(decomposeAlphabetTarget("쾅")).toEqual(["ㅋ", "ㅘ", "ㅇ"]);
    expect(decomposeAlphabetTarget("꾀")).toEqual(["ㄱ", "ㄱ", "ㅚ"]);
    expect(decomposeAlphabetTarget("읽")).toEqual(["ㅇ", "ㅣ", "ㄹ", "ㄱ"]);
    for (const level of ALPHABET_COURSES[2]!.levels) {
      expect(level.tapGroups.flat().every((tap) => !["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅢ"].includes(tap))).toBe(true);
      const board = createAlphabetBoard(level.tapGroups.flat(), level.pool, 81, () => 0.42, level.trapChance);
      expect(board.some((tile) => level.sequence.includes(tile.value))).toBe(false);
    }
    expect(ALPHABET_COURSES[2]!.levels.map((level) => level.sequence)).toEqual([
      ["나", "너"],
      ["몸", "피", "눈", "코", "입", "손", "발"],
      ["집", "일", "밥", "옷", "잠"],
      ["땅", "물", "불", "비", "산", "강", "해", "달", "별"],
      ["힘", "꾀", "꿈", "개", "소", "말", "닭", "술", "춤"],
    ]);
    expect(ALPHABET_COURSES[2]!.levels[0]!.tapGroups[0]).toEqual(["ㄴ", "ㅣ", "ㆍ"]);
    expect(ALPHABET_COURSES[2]!.levels[4]!.tapGroups[1]).toEqual(["ㄱ", "ㄱ", "ㆍ", "ㅡ", "ㅣ"]);
    expect(ALPHABET_COURSES[2]!.levels[4]!.pool).not.toContain("ㄲ");
    expect(ALPHABET_COURSES[2]!.levels.map((level) => level.trapChance)).toEqual([.14, .16, .18, .20, .22]);
  });

  it("advances only when the expected symbol is tapped", () => {
    const sequence = ["ㄱ", "ㄴ"];
    expect(checkSequenceTap(sequence, 0, "ㄷ")).toEqual({ correct: false, nextIndex: 0, complete: false });
    expect(checkSequenceTap(sequence, 0, "ㄱ")).toEqual({ correct: true, nextIndex: 1, complete: false });
    expect(checkSequenceTap(sequence, 1, "ㄴ")).toEqual({ correct: true, nextIndex: 2, complete: true });
  });
});
