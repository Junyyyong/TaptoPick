import { describe, expect, it } from "vitest";
import { materializeTargetTokens, targetToTokens } from "../core/hangul/target";
import { canAcceptInput } from "./inputCapacity";

describe("typing capacity", () => {
  it("stops accepting taps at the target key count", () => {
    const target = "저는 학생이에요!";
    const input = materializeTargetTokens(targetToTokens(target));
    expect(canAcceptInput(input.length - 1, target)).toBe(true);
    expect(canAcceptInput(input.length, target)).toBe(false);
    expect(canAcceptInput(input.length + 20, target)).toBe(false);
  });

  it("allows another tap after Delete reduces the input count", () => {
    const target = "사랑";
    const input = materializeTargetTokens(targetToTokens(target));
    expect(canAcceptInput(input.length, target)).toBe(false);
    expect(canAcceptInput(input.length - 1, target)).toBe(true);
  });

  it("allows every key through the final vowel of a long Korean sentence", () => {
    const target = "오늘 날씨가 아주 좋아요.";
    const input = materializeTargetTokens(targetToTokens(target));
    for (let index = 0; index < input.length; index += 1) {
      expect(canAcceptInput(index, target), `blocked key ${index + 1} of ${input.length}`).toBe(true);
    }
    expect(canAcceptInput(input.length, target)).toBe(false);
  });
});
