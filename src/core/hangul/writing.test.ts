import { describe, expect, it } from "vitest";
import { evaluateWriting, lessonCheerFor, lessonScoreFromTime, scoreFromTime, type WritingRules } from "./writing";

const rules: WritingRules = {
  minSyllables: 8,
  minWords: 2,
};

describe("topic writing evaluation", () => {
  it("accepts a complete sentence containing the topic", () => {
    const result = evaluateWriting("나는 친구와 함께 여행을 떠나요!", "여행", 30_000, 60_000, rules);
    expect(result.complete).toBe(true);
    expect(result.score).toBe(550);
  });

  it("rejects repetition and incomplete jamo as an unfinished sentence", () => {
    const result = evaluateWriting("여행 여행 여행ㄱ", "여행", 30_000, 60_000, rules);
    expect(result.complete).toBe(false);
    expect(result.checks.composed).toBe(false);
    expect(result.score).toBe(0);
  });

  it("uses the same time-only score range for either game mode", () => {
    expect(scoreFromTime(0, 60_000)).toBe(1000);
    expect(scoreFromTime(30_000, 60_000)).toBe(550);
    expect(scoreFromTime(60_000, 60_000)).toBe(100);
  });

  it("scores one complete five-phrase lesson from its total time", () => {
    expect(lessonScoreFromTime(0, 150_000)).toBe(1500);
    expect(lessonScoreFromTime(150_000, 150_000)).toBe(1400);
    expect(lessonScoreFromTime(180_000, 150_000)).toBe(1000);
    expect(lessonScoreFromTime(200_000, 150_000)).toBe(600);
    expect(lessonScoreFromTime(240_000, 150_000)).toBe(300);
    expect(lessonScoreFromTime(300_000, 150_000)).toBe(0);
  });

  it("maps the Lv.5 time boundaries to the intended result labels", () => {
    expect([150_000, 180_000, 200_000, 240_000, 300_000].map((time) => lessonCheerFor(lessonScoreFromTime(time, 150_000)))).toEqual([
      "OH MY GOD~!", "UNBELIEVABLE!!", "AMAZING!", "GREAT!", "GOOD TRY!",
    ]);
  });

  it("uses the five TAPtoTEN score bands", () => {
    expect([0, 300, 600, 1000, 1400].map(lessonCheerFor)).toEqual([
      "GOOD TRY!", "GREAT!", "AMAZING!", "UNBELIEVABLE!!", "OH MY GOD~!",
    ]);
  });
});
