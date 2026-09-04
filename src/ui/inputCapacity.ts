import { targetToTokens } from "../core/hangul/target";

/** Prevents extra taps after the exact target key count without blocking partial syllables. */
export function canAcceptInput(inputCount: number, targetText: string): boolean {
  return inputCount < targetToTokens(targetText).length;
}
