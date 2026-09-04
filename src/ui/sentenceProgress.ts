export interface SentenceProgress {
  unlockedLevel: number;
  bestScores: Record<string, number>;
}

const KEY = "taptotalk.sentence-progress.v1";
const EMPTY: SentenceProgress = { unlockedLevel: 0, bestScores: {} };

export function loadSentenceProgress(): SentenceProgress {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SentenceProgress>;
    return {
      unlockedLevel: Math.max(0, Number(stored.unlockedLevel) || 0),
      bestScores: stored.bestScores && typeof stored.bestScores === "object"
        ? Object.fromEntries(Object.entries(stored.bestScores).map(([level, score]) => [level, Math.min(1500, Math.max(0, Number(score) || 0))]))
        : {},
    };
  } catch {
    return { ...EMPTY, bestScores: {} };
  }
}

export function saveSentenceProgress(progress: SentenceProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // The active run remains playable when private browsing blocks storage.
  }
}
