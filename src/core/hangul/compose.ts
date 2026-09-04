import type { BoardSymbol, CheonjiinStroke, Consonant } from "./keys";
import { CHEONJIIN_STROKES, CONSONANTS } from "./keys";
import {
  CHOSEONG,
  FINAL_FROM_PARTS,
  JONGSEONG,
  JUNGSEONG,
  VOWEL_FROM_STROKES,
} from "./layout";

const isConsonant = (token: string): token is Consonant =>
  (CONSONANTS as readonly string[]).includes(token);
const isStroke = (token: string): token is CheonjiinStroke =>
  (CHEONJIIN_STROKES as readonly string[]).includes(token);

interface Syllable {
  initial?: Consonant;
  strokes: CheonjiinStroke[];
  finals: Consonant[];
}

function renderSyllable(syllable: Syllable): string {
  const { initial, strokes, finals } = syllable;
  if (!initial) return strokes.join("") + finals.join("");

  const vowel = VOWEL_FROM_STROKES.get(strokes.join(""));
  const final = FINAL_FROM_PARTS.get(finals.join("")) ?? "";
  if (!vowel || (finals.length > 0 && !final)) {
    return initial + strokes.join("") + finals.join("");
  }

  const initialIndex = CHOSEONG.indexOf(initial);
  const vowelIndex = JUNGSEONG.indexOf(vowel);
  const finalIndex = JONGSEONG.indexOf(final);
  return String.fromCodePoint(0xac00 + (initialIndex * 21 + vowelIndex) * 28 + finalIndex);
}

/**
 * Composes a stream of board symbols and fixed characters into display text.
 * Backspace is implemented by removing one source token and recomposing, so
 * the UI never has to understand Hangul state transitions.
 */
export function composeTokens(tokens: readonly string[]): string {
  const output: string[] = [];
  let current: Syllable = { strokes: [], finals: [] };

  const flush = (): void => {
    if (current.initial || current.strokes.length || current.finals.length) {
      output.push(renderSyllable(current));
    }
    current = { strokes: [], finals: [] };
  };

  for (const token of tokens) {
    if (!isConsonant(token) && !isStroke(token)) {
      flush();
      output.push(token);
      continue;
    }

    if (isStroke(token)) {
      if (current.finals.length) {
        const moving = current.finals.pop()!;
        flush();
        current.initial = moving;
      }
      current.strokes.push(token);
      continue;
    }

    if (!current.initial) {
      current.initial = token;
      continue;
    }

    if (current.strokes.length === 0) {
      flush();
      current.initial = token;
      continue;
    }

    const candidate = [...current.finals, token].join("");
    if (FINAL_FROM_PARTS.has(candidate)) {
      current.finals.push(token);
    } else {
      flush();
      current.initial = token;
    }
  }

  flush();
  return output.join("");
}

export function appendToken(tokens: readonly string[], token: BoardSymbol | string): string[] {
  return [...tokens, token];
}

export function backspaceToken(tokens: readonly string[]): string[] {
  return tokens.slice(0, -1);
}
