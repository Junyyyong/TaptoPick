import { describe, expect, it } from "vitest";
import { failureClip, poolFor, randomClipFor } from "./cheer";

describe("score-based celebration clips", () => {
  it("offers all six celebration clips at every score band", () => {
    expect(poolFor(100).at(0)?.layout).toBe("compact");
    expect(poolFor(300).at(0)?.layout).toBe("standard");
    expect(poolFor(600).at(0)?.layout).toBe("large");
    expect(poolFor(1000).at(0)?.layout).toBe("hero");
    expect(poolFor(1400).at(0)?.layout).toBe("hero");
    for (const score of [100, 300, 600, 1000, 1400]) {
      const pool = poolFor(score);
      expect(pool).toHaveLength(6);
      expect(new Set(pool.map((clip) => clip.video)).size).toBe(6);
      expect(pool.every((clip) => clip.video.endsWith(".webm"))).toBe(true);
      expect(pool.every((clip) => clip.iosVideo?.endsWith(".mp4"))).toBe(true);
      expect(pool.every((clip) => clip.sound?.endsWith(".mp3"))).toBe(true);
    }
  });

  it("can randomly select every clip in the pool", () => {
    const pool = poolFor(1000);
    const picks = pool.map((_, index) => randomClipFor(1000, () => (index + 0.5) / pool.length)?.video);
    expect(new Set(picks)).toEqual(new Set(pool.map((clip) => clip.video)));
  });

  it("reserves Tipi for failed runs", () => {
    expect(failureClip().video).toMatch(/movie\/tipi\.webm$/);
    expect(failureClip().iosVideo).toMatch(/movie\/tipi\.mp4$/);
    expect(failureClip().sound).toMatch(/movie\/tipi\.mp3$/);
    expect(poolFor(1000).every((clip) => !clip.video.includes("tipi"))).toBe(true);
    expect(poolFor(1000).some((clip) => /movie\/1\.webm$/.test(clip.video))).toBe(true);
  });
});
