import { describe, it, expect } from "vitest";
import { MontageProgress, PickLives, MONTAGE_STAGES, createStagedMontageBoard, montageMotion, planMontageSwap } from "./montage";

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
  it("closes doors before swapping, holds them shut, then reopens", () => {
    expect(montageMotion(5999)).toEqual({phase:"ready",cycle:0,closure:0});
    expect(montageMotion(6000)).toEqual({phase:"closing",cycle:0,closure:0});
    expect(montageMotion(6180)).toEqual({phase:"closing",cycle:0,closure:.5});
    expect(montageMotion(6360)).toEqual({phase:"closed",cycle:0,closure:1});
    expect(montageMotion(6479)).toEqual({phase:"closed",cycle:0,closure:1});
    expect(montageMotion(6660)).toEqual({phase:"opening",cycle:0,closure:.5});
    expect(montageMotion(6840)).toEqual({phase:"ready",cycle:1,closure:0});
    expect(montageMotion(13200)).toEqual({phase:"closed",cycle:1,closure:1});
  });
  it("swaps exactly two different pictures and leaves the other 23 untouched", () => {
    const board = createStagedMontageBoard(5,[1,2,3]);
    for (const value of [0, .2, .5, .9999]) {
      const plan = planMontageSwap(board,()=>value);
      const changed = plan.tiles.filter((tile,index)=>tile.id!==board[index]!.id);
      expect(changed).toHaveLength(2);
      expect(new Set(changed.map(tile=>tile.id))).toEqual(new Set(plan.ids));
      expect(changed[0]!.variationIndex).not.toBe(changed[1]!.variationIndex);
      expect([...plan.tiles].sort((a,b)=>a.id-b.id)).toEqual([...board].sort((a,b)=>a.id-b.id));
      expect(plan.tiles.filter(t=>t.exact)).toHaveLength(1);
    }
  });
  it("does not force the answer to move each time and never mutates the original board", () => {
    const board = createStagedMontageBoard(5,[1,2,3],()=>.9999);
    const original = [...board];
    const plan = planMontageSwap(board,()=>.5);
    expect(plan.ids).not.toContain(0);
    expect(board).toEqual(original);
    expect(planMontageSwap([]).ids).toEqual([]);
  });
});
