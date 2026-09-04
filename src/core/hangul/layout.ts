import type { BoardSymbol, CheonjiinStroke, Consonant } from "./keys";

export const CHOSEONG: readonly Consonant[] = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export const JUNGSEONG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ",
  "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
] as const;

export type Jungseong = (typeof JUNGSEONG)[number];

export const JONGSEONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ",
  "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ",
  "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

export type Jongseong = (typeof JONGSEONG)[number];

/**
 * Canonical Cheonjiin stroke sequences used by the game.
 *
 * They live in one data table so a product decision about a sequence does not
 * leak into the composer, board generator, UI, or content files.
 */
export const VOWEL_STROKES: Readonly<Record<Jungseong, readonly CheonjiinStroke[]>> = {
  "ㅏ": ["ㅣ", "ㆍ"],
  "ㅐ": ["ㅣ", "ㆍ", "ㅣ"],
  "ㅑ": ["ㅣ", "ㆍ", "ㆍ"],
  "ㅒ": ["ㅣ", "ㆍ", "ㆍ", "ㅣ"],
  "ㅓ": ["ㆍ", "ㅣ"],
  "ㅔ": ["ㆍ", "ㅣ", "ㅣ"],
  "ㅕ": ["ㆍ", "ㆍ", "ㅣ"],
  "ㅖ": ["ㆍ", "ㆍ", "ㅣ", "ㅣ"],
  "ㅗ": ["ㆍ", "ㅡ"],
  "ㅘ": ["ㆍ", "ㅡ", "ㅣ", "ㆍ"],
  "ㅙ": ["ㆍ", "ㅡ", "ㅣ", "ㆍ", "ㅣ"],
  "ㅚ": ["ㆍ", "ㅡ", "ㅣ"],
  "ㅛ": ["ㆍ", "ㆍ", "ㅡ"],
  "ㅜ": ["ㅡ", "ㆍ"],
  "ㅝ": ["ㅡ", "ㆍ", "ㆍ", "ㅣ"],
  "ㅞ": ["ㅡ", "ㆍ", "ㆍ", "ㅣ", "ㅣ"],
  "ㅟ": ["ㅡ", "ㆍ", "ㅣ"],
  "ㅠ": ["ㅡ", "ㆍ", "ㆍ"],
  "ㅡ": ["ㅡ"],
  "ㅢ": ["ㅡ", "ㅣ"],
  "ㅣ": ["ㅣ"],
};

export const FINAL_PARTS: Readonly<Record<Exclude<Jongseong, "">, readonly Consonant[]>> = {
  "ㄱ": ["ㄱ"], "ㄲ": ["ㄲ"], "ㄳ": ["ㄱ", "ㅅ"], "ㄴ": ["ㄴ"],
  "ㄵ": ["ㄴ", "ㅈ"], "ㄶ": ["ㄴ", "ㅎ"], "ㄷ": ["ㄷ"], "ㄹ": ["ㄹ"],
  "ㄺ": ["ㄹ", "ㄱ"], "ㄻ": ["ㄹ", "ㅁ"], "ㄼ": ["ㄹ", "ㅂ"],
  "ㄽ": ["ㄹ", "ㅅ"], "ㄾ": ["ㄹ", "ㅌ"], "ㄿ": ["ㄹ", "ㅍ"],
  "ㅀ": ["ㄹ", "ㅎ"], "ㅁ": ["ㅁ"], "ㅂ": ["ㅂ"], "ㅄ": ["ㅂ", "ㅅ"],
  "ㅅ": ["ㅅ"], "ㅆ": ["ㅆ"], "ㅇ": ["ㅇ"], "ㅈ": ["ㅈ"], "ㅊ": ["ㅊ"],
  "ㅋ": ["ㅋ"], "ㅌ": ["ㅌ"], "ㅍ": ["ㅍ"], "ㅎ": ["ㅎ"],
};

export const FINAL_FROM_PARTS = new Map<string, Jongseong>(
  Object.entries(FINAL_PARTS).map(([final, parts]) => [parts.join(""), final as Jongseong]),
);

export const VOWEL_FROM_STROKES = new Map<string, Jungseong>(
  Object.entries(VOWEL_STROKES).map(([vowel, strokes]) => [strokes.join(""), vowel as Jungseong]),
);

export type InputToken = BoardSymbol | " " | string;
