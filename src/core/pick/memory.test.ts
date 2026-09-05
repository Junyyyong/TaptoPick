import { describe, expect, it } from "vitest";
import { MEMORY_STAGES, MemoryRun } from "./memory";

const faces = Array.from({ length: 8 }, (_, i) => `face-${i}.webp`);
const makeRun = () => new MemoryRun(faces, 3_000, { match: 250, mismatch: 450 }, () => 0.4);

function clearStage(run: MemoryRun): void {
  if (run.phase === "preview") run.advance(3_000);
  const stage = run.stageIndex;
  while (run.stageIndex === stage && run.phase !== "won") {
    const first = run.cards.find((card) => !card.free && !run.matchedIds.has(card.id))!;
    const second = run.cards.find((card) => card.id !== first.id && card.src === first.src && !run.matchedIds.has(card.id))!;
    expect(run.choose(first.id)).toBe("first");
    expect(run.choose(second.id)).toBe("match");
    run.advance(250);
  }
}

describe("four-stage memory run", () => {
  it("defines the requested board sizes, pair counts, and per-stage deadlines", () => {
    expect(MEMORY_STAGES).toEqual([
      { size: 4, pairs: 8, limitMs: 60_000 },
      { size: 5, pairs: 12, limitMs: 60_000 },
      { size: 6, pairs: 18, limitMs: 90_000 },
      { size: 7, pairs: 24, limitMs: 120_000 },
    ]);
  });

  it("clears all four boards in order, resetting the preview and timer each stage", () => {
    const run = makeRun();
    MEMORY_STAGES.forEach((stage, index) => {
      expect(run.stageIndex).toBe(index);
      expect(run.phase).toBe("preview");
      expect(run.previewRemainingMs).toBe(3_000);
      expect(run.remainingMs).toBe(stage.limitMs);
      expect(run.matchedPairs).toBe(0);
      expect(run.cards).toHaveLength(stage.size * stage.size);
      clearStage(run);
    });
    expect(run.phase).toBe("won");
    expect(run.matchedPairs).toBe(24);
    const total = run.totalElapsedMs;
    run.advance(100_000);
    expect(run.totalElapsedMs).toBe(total);
  });

  it("excludes previews from play time and locks input until the preview ends", () => {
    const run = makeRun();
    expect(run.choose(run.cards[0]!.id)).toBe("ignored");
    run.advance(2_999);
    expect(run.phase).toBe("preview");
    expect(run.remainingMs).toBe(60_000);
    run.advance(1);
    expect(run.phase).toBe("playing");
    expect(run.totalElapsedMs).toBe(0);
    run.advance(1_000);
    expect(run.remainingMs).toBe(59_000);
  });

  it.each([0, 1, 2, 3])("ends the run when stage %i reaches its deadline", (stageIndex) => {
    const run = makeRun();
    for (let i = 0; i < stageIndex; i++) clearStage(run);
    run.advance(3_000);
    run.advance(run.stage.limitMs - 1);
    expect(run.phase).toBe("playing");
    run.advance(1);
    expect(run.phase).toBe("lost");
    expect(run.remainingMs).toBe(0);
    expect(run.choose(run.cards[0]!.id)).toBe("ignored");
    run.advance(1_000);
    expect(run.stageIndex).toBe(stageIndex);
  });

  it("accepts identical faces from different original pairs without matching every copy", () => {
    const run = makeRun();
    clearStage(run);
    run.advance(3_000);
    const first = run.cards.find((card) => !card.free && run.cards.some((other) => other.src === card.src && other.pairId !== card.pairId))!;
    const second = run.cards.find((card) => card.src === first.src && card.pairId !== first.pairId)!;
    run.choose(first.id);
    expect(run.choose(second.id)).toBe("match");
    expect(run.matchedPairs).toBe(1);
    expect([...run.matchedIds].sort()).toEqual([first.id, second.id].sort());
    run.advance(250);
    expect(run.choose(first.id)).toBe("ignored");
    expect(run.choose(run.cards.find((card) => card.free)!.id)).toBe("ignored");
    clearStage(run);
    expect(run.stageIndex).toBe(2);
  });

  it("allows retry after a mismatch and keeps pending reveals frozen without time advances", () => {
    const run = makeRun();
    run.advance(3_000);
    const first = run.cards[0]!;
    const wrong = run.cards.find((card) => card.src !== first.src)!;
    expect(run.choose(first.id)).toBe("first");
    expect(run.choose(first.id)).toBe("ignored");
    expect(run.choose(wrong.id)).toBe("mismatch");
    expect(run.mistakes).toBe(1);
    expect(run.choose(run.cards[2]!.id)).toBe("ignored");
    run.advance(449);
    run.advance(0);
    expect(run.phase).toBe("resolving");
    expect(run.openIds.size).toBe(2);
    run.advance(1);
    expect(run.openIds.size).toBe(0);
    expect(run.choose(first.id)).toBe("first");
  });

  it("honors the last correct pair before a deadline despite its reveal animation", () => {
    const run = makeRun();
    run.advance(3_000);
    for (const src of faces.slice(0, 7)) {
      const pair = run.cards.filter((card) => card.src === src);
      pair.forEach((card) => run.choose(card.id));
      run.advance(250);
    }
    run.advance(run.remainingMs - 1);
    run.cards.filter((card) => card.src === faces[7]).forEach((card) => run.choose(card.id));
    run.advance(250);
    expect(run.stageIndex).toBe(1);
    expect(run.phase).toBe("preview");
    expect(run.remainingMs).toBe(60_000);
  });
});
