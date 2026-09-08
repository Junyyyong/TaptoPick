export interface RunSummary {
  mode: "unit" | "montage" | "memory";
  won: boolean;
  elapsedMs: number;
  mistakes: number;
  found: number;
  total: number;
  /** One-based stage reached, including an unfinished stage. */
  stage: number;
  score: number;
  characterId?: string;
}

export interface ResultRecord {
  summary: RunSummary;
  best: RunSummary;
  isNewBest: boolean;
  previousBest?: RunSummary;
  storageAvailable: boolean;
}

export const PICK_RECORDS_STORAGE_KEY = "taptopick.records.v1";
const sessionBests = new Map<string, RunSummary>();
const MAX_RECORDS = 512;
const MAX_STORED_LENGTH = 128_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function isRunSummary(value: unknown): value is RunSummary {
  if (!isObject(value)) return false;
  if (value.mode !== "unit" && value.mode !== "montage" && value.mode !== "memory") return false;
  if (typeof value.won !== "boolean") return false;
  if (typeof value.elapsedMs !== "number" || !Number.isFinite(value.elapsedMs)
    || value.elapsedMs < 0 || value.elapsedMs > 365 * 24 * 60 * 60 * 1000) return false;
  if (!isInteger(value.mistakes, 0, 1_000_000) || !isInteger(value.found, 0, 10_000)
    || !isInteger(value.total, 1, 10_000) || value.found > value.total
    || !isInteger(value.stage, 1, 1000) || !isInteger(value.score, 0, 1_000_000_000)) return false;
  if (value.won && value.found !== value.total) return false;
  return value.characterId === undefined
    || (typeof value.characterId === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value.characterId));
}

function copySummary(summary: RunSummary): RunSummary {
  // Only retain the schema, not unexpected fields in edited browser storage.
  return {
    mode: summary.mode,
    won: summary.won,
    elapsedMs: summary.elapsedMs,
    mistakes: summary.mistakes,
    found: summary.found,
    total: summary.total,
    stage: summary.stage,
    score: summary.score,
    ...(summary.characterId === undefined ? {} : { characterId: summary.characterId }),
  };
}

function recordKey(summary: RunSummary): string {
  // A twelve-piece puzzle should not compete with a nine-piece puzzle.
  return summary.mode === "unit"
    ? `unit:${summary.characterId ?? "unknown"}:${summary.total}`
    : summary.mode;
}

/** Positive means candidate is better; zero means tied or not comparable. */
export function comparePickResults(candidate: RunSummary, previous: RunSummary): number {
  if (recordKey(candidate) !== recordKey(previous)) return 0;
  if (candidate.mode === "unit") {
    if (candidate.won !== previous.won) return candidate.won ? 1 : -1;
    if (candidate.won) return Math.sign(previous.elapsedMs - candidate.elapsedMs);
    return Math.sign(candidate.found / candidate.total - previous.found / previous.total);
  }
  if (candidate.mode === "montage") {
    return Math.sign(candidate.found - previous.found)
      || Math.sign(previous.mistakes - candidate.mistakes);
  }
  return (candidate.won === previous.won ? 0 : candidate.won ? 1 : -1)
    || Math.sign(candidate.stage - previous.stage)
    || Math.sign(candidate.found - previous.found)
    || Math.sign(previous.elapsedMs - candidate.elapsedMs);
}

function hasProgress(summary: RunSummary): boolean {
  return summary.won || summary.found > 0 || (summary.mode !== "unit" && summary.stage > 1);
}

function readStoredBests(raw: string | null): Map<string, RunSummary> {
  const bests = new Map<string, RunSummary>();
  if (!raw || raw.length > MAX_STORED_LENGTH) return bests;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.bestByKey)) return bests;
    for (const [key, value] of Object.entries(parsed.bestByKey).slice(0, MAX_RECORDS)) {
      if (isRunSummary(value) && key === recordKey(value) && hasProgress(value)) {
        bests.set(key, copySummary(value));
      }
    }
  } catch {
    // A malformed record is discarded without disrupting the result screen.
  }
  return bests;
}

/** Persist a best result when possible; private/blocked storage keeps session records. */
export function savePickResult(summary: RunSummary): ResultRecord {
  if (!isRunSummary(summary)) throw new RangeError("Invalid TAPtoPICK result summary");
  const current = copySummary(summary);
  let storage: Storage | undefined;
  let storageAvailable = false;
  try {
    storage = globalThis.localStorage;
    const stored = readStoredBests(storage.getItem(PICK_RECORDS_STORAGE_KEY));
    for (const [key, value] of stored) {
      const session = sessionBests.get(key);
      if (!session || comparePickResults(value, session) > 0) sessionBests.set(key, value);
    }
    storageAvailable = true;
  } catch {
    // Storage may be missing entirely or its getter may throw a SecurityError.
  }

  const key = recordKey(current);
  const previous = sessionBests.get(key);
  const isNewBest = hasProgress(current) && (!previous || comparePickResults(current, previous) > 0);
  if (isNewBest) sessionBests.set(key, current);
  const best = sessionBests.get(key) ?? current;

  if (storageAvailable && storage) {
    try {
      storage.setItem(PICK_RECORDS_STORAGE_KEY, JSON.stringify({
        version: 1,
        bestByKey: Object.fromEntries(sessionBests),
      }));
    } catch {
      storageAvailable = false;
    }
  }

  // Return copies so UI presentation cannot mutate persisted/session results.
  return {
    summary: copySummary(current),
    best: copySummary(best),
    isNewBest,
    ...(previous ? { previousBest: copySummary(previous) } : {}),
    storageAvailable,
  };
}
