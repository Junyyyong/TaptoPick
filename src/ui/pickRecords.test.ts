import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunSummary } from "./pickRecords";

const unit = (changes: Partial<RunSummary> = {}): RunSummary => ({
  mode: "unit", won: true, elapsedMs: 20_000, mistakes: 0,
  found: 9, total: 9, stage: 1, score: 1000, characterId: "tepee", ...changes,
});
const montage = (changes: Partial<RunSummary> = {}): RunSummary => ({
  mode: "montage", won: false, elapsedMs: 50_000, mistakes: 5,
  found: 8, total: 18, stage: 2, score: 8, characterId: "haepi", ...changes,
});
const memory = (changes: Partial<RunSummary> = {}): RunSummary => ({
  mode: "memory", won: false, elapsedMs: 120_000, mistakes: 4,
  found: 5, total: 12, stage: 2, score: 0, ...changes,
});

function mockStorage() {
  const entries = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { entries.set(key, value); }),
  };
  vi.stubGlobal("localStorage", storage);
  return { entries, storage };
}

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("TAPtoPICK local result records", () => {
  it("stores a first completion and only improves unit time, not a tie or slower run", async () => {
    const { entries } = mockStorage();
    const { savePickResult, PICK_RECORDS_STORAGE_KEY } = await import("./pickRecords");
    expect(savePickResult(unit())).toMatchObject({ isNewBest: true, storageAvailable: true });
    expect(savePickResult(unit()).isNewBest).toBe(false);
    expect(savePickResult(unit({ elapsedMs: 30_000 })).best.elapsedMs).toBe(20_000);
    expect(savePickResult(unit({ elapsedMs: 10_000 }))).toMatchObject({
      isNewBest: true, best: { elapsedMs: 10_000 }, previousBest: { elapsedMs: 20_000 },
    });
    expect(JSON.parse(entries.get(PICK_RECORDS_STORAGE_KEY)!).bestByKey["unit:tepee:9"].elapsedMs).toBe(10_000);
  });

  it("never promotes a loss over a completed unit puzzle", async () => {
    mockStorage();
    const { savePickResult } = await import("./pickRecords");
    savePickResult(unit({ won: false, found: 4, elapsedMs: 5000, mistakes: 5 }));
    expect(savePickResult(unit({ won: false, found: 5, elapsedMs: 9000, mistakes: 5 })).isNewBest).toBe(true);
    expect(savePickResult(unit()).best.won).toBe(true);
    expect(savePickResult(unit({ won: false, found: 8, elapsedMs: 1000, mistakes: 5 }))).toMatchObject({
      isNewBest: false, best: { won: true, found: 9 }, summary: { won: false },
    });
  });

  it("separates unit records by character and piece count", async () => {
    mockStorage();
    const { savePickResult, comparePickResults } = await import("./pickRecords");
    savePickResult(unit({ elapsedMs: 1000 }));
    const otherCharacter = unit({ characterId: "tapee", elapsedMs: 30_000 });
    const morePieces = unit({ total: 12, found: 12, elapsedMs: 40_000 });
    expect(savePickResult(otherCharacter).isNewBest).toBe(true);
    expect(savePickResult(morePieces).isNewBest).toBe(true);
    expect(savePickResult(unit({ elapsedMs: 2000 })).best.elapsedMs).toBe(1000);
    expect(comparePickResults(unit(), otherCharacter)).toBe(0);
    expect(comparePickResults(unit(), morePieces)).toBe(0);
  });

  it("compares montage by found count then mistakes, regardless of last character", async () => {
    mockStorage();
    const { savePickResult } = await import("./pickRecords");
    savePickResult(montage());
    expect(savePickResult(montage({ found: 7, mistakes: 0 })).isNewBest).toBe(false);
    expect(savePickResult(montage({ mistakes: 4, characterId: "tapee" })).isNewBest).toBe(true);
    expect(savePickResult(montage({ mistakes: 4, elapsedMs: 20_000 })).isNewBest).toBe(false);
    expect(savePickResult(montage({ found: 9, mistakes: 5, stage: 3 })).isNewBest).toBe(true);
  });

  it("compares memory by completion, stage, pairs, then equivalent-progress time", async () => {
    mockStorage();
    const { comparePickResults } = await import("./pickRecords");
    expect(comparePickResults(memory({ stage: 3, total: 18, found: 0 }), memory())).toBe(1);
    expect(comparePickResults(memory({ found: 6 }), memory())).toBe(1);
    expect(comparePickResults(memory({ elapsedMs: 110_000 }), memory())).toBe(1);
    expect(comparePickResults(memory(), memory())).toBe(0);
    expect(comparePickResults(memory({ won: true, stage: 4, found: 24, total: 24 }),
      memory({ stage: 4, found: 23, total: 24, elapsedMs: 1000 }))).toBe(1);
    expect(comparePickResults(memory(), montage())).toBe(0);
  });

  it("does not celebrate or persist an initial zero-progress loss", async () => {
    const { entries } = mockStorage();
    const { savePickResult, PICK_RECORDS_STORAGE_KEY } = await import("./pickRecords");
    expect(savePickResult(unit({ won: false, found: 0, score: 0 })).isNewBest).toBe(false);
    expect(savePickResult(montage({ found: 0, stage: 1, score: 0 })).isNewBest).toBe(false);
    expect(savePickResult(memory({ found: 0, stage: 1, total: 8 })).isNewBest).toBe(false);
    expect(JSON.parse(entries.get(PICK_RECORDS_STORAGE_KEY)!).bestByKey).toEqual({});
    expect(savePickResult(memory({ found: 0 })).isNewBest).toBe(true);
  });

  it("loads a saved record after a fresh session", async () => {
    mockStorage();
    const first = await import("./pickRecords");
    first.savePickResult(unit());
    vi.resetModules();
    const next = await import("./pickRecords");
    expect(next.savePickResult(unit({ elapsedMs: 30_000 }))).toMatchObject({
      isNewBest: false, best: { elapsedMs: 20_000 }, storageAvailable: true,
    });
  });

  it.each(["{broken", "null", "[]", '{"version":2,"bestByKey":{}}'])
    ("recovers from malformed or unsupported storage: %s", async (raw) => {
      const { entries } = mockStorage();
      const { savePickResult, PICK_RECORDS_STORAGE_KEY } = await import("./pickRecords");
      entries.set(PICK_RECORDS_STORAGE_KEY, raw);
      expect(savePickResult(unit())).toMatchObject({ isNewBest: true, storageAvailable: true });
      expect(JSON.parse(entries.get(PICK_RECORDS_STORAGE_KEY)!).version).toBe(1);
    });

  it("rejects invalid stored fields and mismatched record keys while retaining valid data", async () => {
    const { entries } = mockStorage();
    const { savePickResult, PICK_RECORDS_STORAGE_KEY } = await import("./pickRecords");
    entries.set(PICK_RECORDS_STORAGE_KEY, JSON.stringify({ version: 1, bestByKey: {
      "unit:tepee:9": unit({ elapsedMs: -1 }),
      "unit:tapee:9": unit({ elapsedMs: 1 }),
      montage: montage({ found: 999_999 }),
      memory: memory(),
    } }));
    expect(savePickResult(unit()).isNewBest).toBe(true);
    expect(savePickResult(memory({ found: 3 })).isNewBest).toBe(false);
    expect(savePickResult(montage()).isNewBest).toBe(true);
    expect(JSON.parse(entries.get(PICK_RECORDS_STORAGE_KEY)!).bestByKey["unit:tapee:9"]).toBeUndefined();
  });

  it("retains session records when storage is unavailable", async () => {
    vi.stubGlobal("localStorage", undefined);
    const { savePickResult } = await import("./pickRecords");
    expect(savePickResult(unit())).toMatchObject({ isNewBest: true, storageAvailable: false });
    expect(savePickResult(unit({ elapsedMs: 30_000 }))).toMatchObject({
      isNewBest: false, best: { elapsedMs: 20_000 }, storageAvailable: false,
    });
  });

  it("handles read and quota failures without losing the session best", async () => {
    const { storage } = mockStorage();
    storage.getItem.mockImplementation(() => { throw new Error("SecurityError"); });
    const { savePickResult } = await import("./pickRecords");
    expect(savePickResult(unit()).storageAvailable).toBe(false);
    storage.getItem.mockImplementation(() => null);
    storage.setItem.mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(savePickResult(unit({ elapsedMs: 30_000 }))).toMatchObject({
      isNewBest: false, best: { elapsedMs: 20_000 }, storageAvailable: false,
    });
  });

  it("does not expose mutable best records to the presentation layer", async () => {
    mockStorage();
    const { savePickResult } = await import("./pickRecords");
    const result = savePickResult(unit());
    result.best.elapsedMs = 0;
    result.summary.elapsedMs = 0;
    expect(savePickResult(unit({ elapsedMs: 30_000 })).best.elapsedMs).toBe(20_000);
  });

  it.each([
    { total: 0 }, { stage: 0 }, { found: 10 }, { elapsedMs: Number.NaN },
    { elapsedMs: Number.POSITIVE_INFINITY }, { mistakes: -1 }, { score: -1 },
    { characterId: "../unsafe" }, { found: 8 },
  ])("rejects an invalid caller summary: %o", async (changes) => {
    mockStorage();
    const { savePickResult } = await import("./pickRecords");
    expect(() => savePickResult(unit(changes))).toThrow(RangeError);
  });
});
