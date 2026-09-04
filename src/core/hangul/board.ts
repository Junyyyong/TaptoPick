import { BOARD_SYMBOLS, PUNCTUATION_SYMBOLS, type BoardSymbol } from "./keys";
import { requiredBoardSymbols } from "./target";

export const BOARD_SIZE = 81;
export const TARGET_SYMBOL_BUFFER = 1.5;
export const MIRROR_TRAP_CHANCE = 0.2;
export type MirrorAxis = "horizontal" | "vertical";

const HORIZONTAL_MIRROR_SYMBOLS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅋ", "ㅌ"] as const;
const VERTICAL_MIRROR_SYMBOLS = ["ㅂ", "ㅅ", "ㅈ", "ㅎ"] as const;

export function mirrorAxisFor(symbol: BoardSymbol): MirrorAxis | undefined {
  if ((HORIZONTAL_MIRROR_SYMBOLS as readonly string[]).includes(symbol)) return "horizontal";
  if ((VERTICAL_MIRROR_SYMBOLS as readonly string[]).includes(symbol)) return "vertical";
  return undefined;
}

export interface LetterTile {
  id: number;
  symbol: BoardSymbol;
  /** True when this copy was reserved to make the target solvable. */
  required: boolean;
  /** Punctuation-free word boards may show spare consonants in reverse. */
  mirror?: MirrorAxis;
}

export const MIRROR_TRAP_TOKEN = "×";

export function inputValueForTile(tile: Pick<LetterTile, "symbol" | "mirror">): BoardSymbol | typeof MIRROR_TRAP_TOKEN {
  return tile.mirror ? MIRROR_TRAP_TOKEN : tile.symbol;
}

export type SymbolWeights = Readonly<Partial<Record<BoardSymbol, number>>>;

/** Common Korean letters receive more of the board's spare positions. */
export const DEFAULT_SYMBOL_WEIGHTS: SymbolWeights = {
  "ㄱ": 8, "ㄲ": 2, "ㄴ": 12, "ㄷ": 6, "ㄸ": 2, "ㄹ": 9, "ㅁ": 7,
  "ㅂ": 6, "ㅃ": 2, "ㅅ": 10, "ㅆ": 3, "ㅇ": 14, "ㅈ": 6, "ㅉ": 2,
  "ㅊ": 4, "ㅋ": 3, "ㅌ": 3, "ㅍ": 3, "ㅎ": 7,
  "ㅣ": 12, "ㆍ": 14, "ㅡ": 9,
  ".": 1, "!": 1, "?": 1,
};

function weightedPick(rng: () => number, weights: SymbolWeights, symbols: readonly BoardSymbol[]): BoardSymbol {
  const entries = symbols.map((symbol) => [symbol, Math.max(0, weights[symbol] ?? 2)] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * total;
  for (const [symbol, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return symbol;
  }
  return symbols[symbols.length - 1]!;
}

function shuffle<T>(values: T[], rng: () => number): T[] {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(rng() * (index + 1));
    [values[index], values[other]] = [values[other]!, values[index]!];
  }
  return values;
}

export function createLetterBoard(
  target: string,
  rng: () => number = Math.random,
  weights: SymbolWeights = DEFAULT_SYMBOL_WEIGHTS,
): LetterTile[] {
  const targetSymbols = requiredBoardSymbols(target);
  const punctuationFree = !targetSymbols.some((symbol) =>
    (PUNCTUATION_SYMBOLS as readonly string[]).includes(symbol),
  );
  const dealSymbols = punctuationFree
    ? BOARD_SYMBOLS.filter((symbol) => !(PUNCTUATION_SYMBOLS as readonly string[]).includes(symbol))
    : BOARD_SYMBOLS;
  const bufferedCount = Math.ceil(targetSymbols.length * TARGET_SYMBOL_BUFFER);
  const required = [...targetSymbols];
  for (let index = required.length; index < bufferedCount; index += 1) {
    required.push(targetSymbols[index % targetSymbols.length]!);
  }
  if (required.length > BOARD_SIZE) {
    throw new RangeError(`Target needs ${required.length} buffered board symbols; maximum is ${BOARD_SIZE}.`);
  }

  const tiles: LetterTile[] = required.map((symbol, id) => ({ id, symbol, required: true }));
  while (tiles.length < BOARD_SIZE) {
    const symbol = weightedPick(rng, weights, dealSymbols);
    const axis = punctuationFree && rng() < MIRROR_TRAP_CHANCE ? mirrorAxisFor(symbol) : undefined;
    tiles.push({ id: tiles.length, symbol, required: false, ...(axis ? { mirror: axis } : {}) });
  }
  return shuffle(tiles, rng);
}
