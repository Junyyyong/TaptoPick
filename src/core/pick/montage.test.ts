import { describe, it, expect } from "vitest";
import { MontageProgress, PickLives, MONTAGE_STAGES, createStagedMontageBoard, montageMotion, reshuffleMontage } from "./montage";

describe("montage stages and lives", () => {
  it("requires 3, 5, 5, 5 correct picks and wins only after all 18", () => {
    const run = new MontageProgress(), lives = new PickLives();
    expect(MONTAGE_STAGES.map((s) => [s.side, s.goal, s.difficulty])).toEqual([[2,3,"easy"],[3,5,"medium"],[4,5,"hard"],[5,5,"hard"]]);
    for (let index = 0; index < 4; index++) {
      expect(run.stageIndex).toBe(index);
      const goal = run.stage.goal;
      for (let i=0; i<goal; i++) {
        expect(run.complete).toBe(false);
        run.correct(lives);
        if (i < goal-1) expect(run.stageIndex).toBe(index);
      }
    }
    expect(run.found).toBe(18);
    expect(run.complete).toBe(true);
    run.correct(lives);
    expect(run.found).toBe(18);
  });
  it("restores exactly one heart at the end of 3x3, not at five total picks", () => {
    const run = new MontageProgress(), lives = new PickLives();
    lives.lose(); lives.lose();
    for (let i=0; i<7; i++) expect(run.correct(lives).bonus).toBe(false);
    expect(lives.remaining).toBe(3);
    expect(run.correct(lives)).toEqual({ bonus: true, promoted: true });
    expect(lives.remaining).toBe(4);
    for (let i=0; i<10; i++) expect(run.correct(lives).bonus).toBe(false);
    expect(lives.remaining).toBe(4);
  });
  it("caps hearts at five and never banks an unused bonus or revives a lost run", () => {
    const run = new MontageProgress(), lives = new PickLives();
    for(let i=0;i<8;i++) run.correct(lives);
    expect(lives.remaining).toBe(5);
    lives.lose();
    expect(lives.remaining).toBe(4);
    for(let i=0;i<6;i++) lives.lose();
    expect(lives.remaining).toBe(0);
    expect(lives.restore()).toBe(false);
    run.correct(lives);
    expect(run.found).toBe(8);
    expect(new PickLives().remaining).toBe(5);
    expect(new MontageProgress().stage.side).toBe(2);
  });
  it.each([2,3,4,5])("uses only the selected difficulty pool with one answer on size %i", (side) => {
    const board = createStagedMontageBoard(side, [2,7,9], () => .4);
    expect(board).toHaveLength(side*side);
    expect(new Set(board.map((t)=>t.id)).size).toBe(side*side);
    expect(board.filter((t)=>t.exact)).toHaveLength(1);
    expect(board.filter((t)=>!t.exact).every((t)=>[2,7,9].includes(t.variationIndex))).toBe(true);
  });
  it("warns before every shuffle and provides a stable settling interval", () => {
    expect(montageMotion(5999)).toEqual({phase:"ready",revision:0});
    expect(montageMotion(6000)).toEqual({phase:"warning",revision:0});
    expect(montageMotion(6899)).toEqual({phase:"warning",revision:0});
    expect(montageMotion(6900)).toEqual({phase:"moving",revision:1});
    expect(montageMotion(7200)).toEqual({phase:"ready",revision:1});
    expect(montageMotion(14100)).toEqual({phase:"moving",revision:2});
  });
  it("preserves every tile and exactly one answer while moving the answer", () => {
    const board = createStagedMontageBoard(5,[1,2,3]);
    const moved = reshuffleMontage(board,()=>.9999);
    expect(moved.findIndex(t=>t.exact)).not.toBe(board.findIndex(t=>t.exact));
    expect([...moved].sort((a,b)=>a.id-b.id)).toEqual([...board].sort((a,b)=>a.id-b.id));
    expect(moved.filter(t=>t.exact)).toHaveLength(1);
  });
});
