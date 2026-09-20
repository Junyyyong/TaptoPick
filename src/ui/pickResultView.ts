import { MEMORY_STAGES } from "../core/pick/memory";
import type { ResultRecord, RunSummary } from "./pickRecords";

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/** Render only the player's outcome; scores and progression stay in core/pick. */
export function renderPickResult(record: ResultRecord): void {
  const { summary: run, best } = record;
  let primary: string, unit: string, bestLabel: string, detail: string, goal: string;
  if (run.mode === "unit") {
    primary = run.won ? seconds(run.elapsedMs) : `${run.found}/${run.total}`;
    unit = run.won ? "COMPLETION TIME" : "PIECES FOUND";
    bestLabel = best.won ? `${seconds(best.elapsedMs)} · THIS CHARACTER` : `${best.found}/${best.total} PIECES`;
    detail = run.won ? ""
      : `You found ${run.found} pieces. Take another look and try again.`;
    goal = run.won ? run.mistakes === 0 ? "A clean finish. Can you beat your time?" : "Next goal: finish without a wrong pick."
      : "Next goal: complete the picture.";
  } else if (run.mode === "montage") {
    primary = String(run.found); unit = "FOUND";
    bestLabel = `${best.found} FOUND`;
    detail = "";
    goal = run.found < best.found ? `${best.found - run.found} more to match your best.`
      : run.won ? run.mistakes === 0 ? "A perfect run. Can you do it again?" : "Next goal: clear all stages with fewer mistakes." : "Next goal: find one more face.";
  } else {
    primary = run.won ? seconds(run.elapsedMs) : `${run.stage - 1}/${MEMORY_STAGES.length}`;
    unit = run.won ? "COMPLETION TIME" : "STAGES CLEARED";
    const totalPairs = (s: RunSummary): number => MEMORY_STAGES.slice(0, s.stage - 1).reduce((sum, stage) => sum + stage.pairs, s.found);
    bestLabel = best.won ? seconds(best.elapsedMs) : `${best.stage - 1}/${MEMORY_STAGES.length} STAGES · ${totalPairs(best)} PAIRS`;
    detail = run.won ? "" : `${totalPairs(run)} PAIRS FOUND`;
    goal = run.won ? "Can you beat your time?"
      : `Next goal: finish stage ${run.stage} (${MEMORY_STAGES[run.stage - 1]!.size}×${MEMORY_STAGES[run.stage - 1]!.size}).`;
  }
  document.getElementById("result-kicker")!.textContent = record.isNewBest ? "NEW BEST" : "YOUR RUN";
  document.getElementById("result-metrics")!.innerHTML = `<strong class="result-primary">${primary}</strong><span class="result-unit">${unit}</span><div class="result-best"><span>BEST</span><strong>${bestLabel}</strong></div>`;
  document.getElementById("result-detail")!.textContent = detail;
  document.getElementById("result-detail")!.hidden = !detail;
  document.getElementById("result-next-goal")!.textContent = goal;
  document.getElementById("result-layer")!.classList.toggle("is-new-best", record.isNewBest);
}
