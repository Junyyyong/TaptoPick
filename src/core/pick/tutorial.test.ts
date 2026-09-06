import { describe, it, expect } from "vitest";
import { PracticeRun } from "./tutorial";
const tiles=[{src:"a",key:"a",target:true},{src:"a",key:"a",target:true},{src:"b",key:"b",target:false},{src:"b",key:"b",target:false}];
describe("isolated practice",()=>{
  it("counts each correct piece once and lets mistakes retry",()=>{
    const run=new PracticeRun("unit",tiles,()=>.99);
    expect(run.pick(2)).toBe("wrong");expect(run.progress).toBe(0);
    expect(run.pick(0)).toBe("correct");expect(run.pick(0)).toBe("ignored");
    expect(run.pick(1)).toBe("correct");expect(run.complete).toBe(true);expect(run.pick(2)).toBe("ignored");
  });
  it("completes an exact-face practice with one answer",()=>{
    const run=new PracticeRun("montage",[tiles[0]!,tiles[2]!],()=>.99);
    expect(run.pick(1)).toBe("wrong");expect(run.pick(0)).toBe("correct");expect(run.complete).toBe(true);
  });
  it("locks mismatched cards until hidden and rejects double taps",()=>{
    const run=new PracticeRun("memory",tiles,()=>.99);
    expect(run.pick(0)).toBe("first");expect(run.pick(0)).toBe("ignored");
    expect(run.pick(2)).toBe("mismatch");expect(run.pick(1)).toBe("ignored");
    run.hideMismatch();expect(run.open).toEqual([]);expect(run.progress).toBe(0);
    run.pick(0);run.pick(1);expect(run.progress).toBe(1);expect(run.open).toEqual([]);
    run.pick(2);run.pick(3);expect(run.complete).toBe(true);
  });
  it("does not mutate source content or share progress between practices",()=>{
    const a=new PracticeRun("unit",tiles),b=new PracticeRun("unit",tiles);
    a.pick(a.tiles.findIndex(t=>t.target));expect(b.progress).toBe(0);expect(tiles[0]!.src).toBe("a");
  });
});
