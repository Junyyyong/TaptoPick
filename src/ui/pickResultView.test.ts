import { afterEach, expect, it, vi } from "vitest";
import { renderPickResult } from "./pickResultView";
import type { RunSummary } from "./pickRecords";

afterEach(() => vi.unstubAllGlobals());

it("hides puzzle score details but preserves time, best and other result details", () => {
  const nodes = new Map<string, { textContent: string; innerHTML: string; hidden: boolean; classList: { toggle: ReturnType<typeof vi.fn> } }>();
  for (const id of ["result-kicker", "result-metrics", "result-detail", "result-next-goal", "result-layer"]) {
    nodes.set(id, { textContent: "", innerHTML: "", hidden: false, classList: { toggle: vi.fn() } });
  }
  vi.stubGlobal("document", { getElementById: (id: string) => nodes.get(id) });
  const run: RunSummary = { mode: "unit", won: true, elapsedMs: 6600, mistakes: 0, found: 9, total: 9, stage: 1, score: 1500 };
  renderPickResult({ summary: run, best: run, isNewBest: true, storageAvailable: true });
  expect(nodes.get("result-detail")).toMatchObject({ textContent: "", hidden: true });
  expect(nodes.get("result-metrics")!.innerHTML).toContain("6.6s");
  expect(nodes.get("result-metrics")!.innerHTML).toContain("BEST");
  renderPickResult({ summary: { ...run, mode: "montage" }, best: run, isNewBest: false, storageAvailable: false });
  expect(nodes.get("result-detail")).toMatchObject({ textContent: "", hidden: true });
  const memory: RunSummary = { ...run, mode: "memory", stage: 3, found: 18, total: 18, memoryVersion: 2 };
  renderPickResult({ summary: memory, best: memory, isNewBest: true, storageAvailable: true });
  expect(nodes.get("result-metrics")!.innerHTML).toContain("COMPLETION TIME");
  expect(nodes.get("result-detail")!.hidden).toBe(true);
  renderPickResult({ summary: { ...memory, won: false, found: 1 }, best: memory, isNewBest: false, storageAvailable: true });
  expect(nodes.get("result-metrics")!.innerHTML).toContain("2/3");
  expect(nodes.get("result-detail")).toMatchObject({ textContent: "11 PAIRS FOUND", hidden: false });
});
