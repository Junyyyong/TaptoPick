import { mirrorAxisFor, type MirrorAxis } from "./board";
import { FINAL_PARTS } from "./layout";

export interface AlphabetTile {
  id: number;
  value: string;
  required: boolean;
  mirror?: MirrorAxis;
}

export interface SequenceTapResult {
  correct: boolean;
  nextIndex: number;
  complete: boolean;
}

const INITIAL_JAMO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const VOWEL_JAMO = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const FINAL_JAMO = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const TENSE_PARTS: Readonly<Record<string, readonly string[]>> = {
  "ㄲ": ["ㄱ", "ㄱ"], "ㄸ": ["ㄷ", "ㄷ"], "ㅃ": ["ㅂ", "ㅂ"], "ㅆ": ["ㅅ", "ㅅ"], "ㅉ": ["ㅈ", "ㅈ"],
};

const splitTense = (jamo: string): readonly string[] => TENSE_PARTS[jamo] ?? [jamo];

/** Break one complete Hangul syllable into visible compatibility-jamo blocks. */
export function decomposeAlphabetTarget(value: string): string[] {
  const code = value.codePointAt(0);
  if (code === undefined || value.length !== 1 || code < 0xac00 || code > 0xd7a3) return [value];
  const offset = code - 0xac00;
  const initial = Math.floor(offset / 588);
  const vowel = Math.floor((offset % 588) / 28);
  const final = offset % 28;
  const initialJamo = INITIAL_JAMO[initial]!;
  const finalJamo = FINAL_JAMO[final]!;
  return [
    ...splitTense(initialJamo),
    VOWEL_JAMO[vowel]!,
    ...(finalJamo ? FINAL_PARTS[finalJamo as keyof typeof FINAL_PARTS].flatMap(splitTense) : []),
  ];
}

const shuffle = <T>(values: T[], rng: () => number): T[] => {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [values[index], values[other]] = [values[other]!, values[index]!];
  }
  return values;
};

/** Create memory targets of the requested lengths, without repeated jamo inside one target. */
export function createRandomAlphabetTargets(
  lengths: readonly number[],
  pool: readonly string[],
  rng: () => number = Math.random,
): string[] {
  if (pool.length === 0) throw new RangeError("Random alphabet targets need at least one jamo.");
  return lengths.map((length) => {
    if (length < 1 || length > pool.length) throw new RangeError(`Target length ${length} must be between 1 and ${pool.length}.`);
    return shuffle([...pool], rng).slice(0, length).join("");
  });
}

export function createAlphabetBoard(
  sequence: readonly string[],
  pool: readonly string[],
  size = 81,
  rng: () => number = Math.random,
  trapChance = 0,
  trapPool: readonly string[] = [],
): AlphabetTile[] {
  if (sequence.length > size) throw new RangeError(`Sequence needs ${sequence.length} tiles; maximum is ${size}.`);
  if (pool.length === 0) throw new RangeError("Alphabet board needs at least one filler value.");
  const tiles: AlphabetTile[] = sequence.map((value, id) => ({ id, value, required: true }));
  while (tiles.length < size) {
    let value = pool[Math.floor(rng() * pool.length)]!;
    let mirror: MirrorAxis | undefined;
    if (rng() < trapChance) {
      if (trapPool.length) value = trapPool[Math.floor(rng() * trapPool.length)]!;
      else mirror = mirrorAxisFor(value as never);
    }
    tiles.push({ id: tiles.length, value, required: false, ...(mirror ? { mirror } : {}) });
  }
  return shuffle(tiles, rng);
}

export function checkSequenceTap(sequence: readonly string[], index: number, value: string): SequenceTapResult {
  const correct = sequence[index] === value;
  const nextIndex = correct ? Math.min(sequence.length, index + 1) : index;
  return { correct, nextIndex, complete: nextIndex === sequence.length };
}
