export type Random = () => number;

export interface SourcePiece {
  characterId: string;
  pieceIndex: number;
  src: string;
}

export interface UnitTile extends SourcePiece {
  id: number;
  target: boolean;
}

export interface MontageTile {
  id: number;
  src: string;
  exact: boolean;
  transform: string;
  filter: string;
}

export interface MemoryCard {
  id: number;
  pairId: number;
  src: string;
  free: boolean;
}

export function shuffle<T>(values: readonly T[], random: Random = Math.random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function createUnitBoard(targetId: string, pieces: readonly SourcePiece[], size = 49, random: Random = Math.random): UnitTile[] {
  const targets = pieces.filter((piece) => piece.characterId === targetId);
  const decoys = shuffle(pieces.filter((piece) => piece.characterId !== targetId), random);
  if (!targets.length) throw new Error(`No pieces for ${targetId}`);
  if (targets.length > size || decoys.length < size - targets.length) throw new Error("Not enough puzzle pieces");

  return shuffle(
    [...targets, ...decoys.slice(0, size - targets.length)].map((piece, id) => ({ ...piece, id, target: piece.characterId === targetId })),
    random,
  );
}

const MONTAGE_VARIANTS = [
  ["scaleX(-1)", "none"], ["scaleY(-1)", "none"], ["rotate(-4deg) scale(1.05)", "none"],
  ["rotate(4deg) scale(1.05)", "none"], ["scale(.92)", "brightness(1.08)"],
  ["scale(1.12)", "contrast(1.12)"], ["none", "hue-rotate(18deg) saturate(1.18)"],
  ["none", "hue-rotate(-18deg) saturate(.82)"], ["none", "brightness(.86) sepia(.12)"],
] as const;

export function createMontageBoard(src: string, size = 81, random: Random = Math.random): MontageTile[] {
  const exactIndex = Math.floor(random() * size);
  return Array.from({ length: size }, (_, id) => {
    if (id === exactIndex) return { id, src, exact: true, transform: "none", filter: "none" };
    const variant = MONTAGE_VARIANTS[(id + exactIndex) % MONTAGE_VARIANTS.length]!;
    const nudge = ((id % 5) - 2) * 0.6;
    return { id, src, exact: false, transform: variant[0] === "none" ? `translate(${nudge}px, ${-nudge}px)` : variant[0], filter: variant[1] };
  });
}

export function createMemoryBoard(pieces: readonly SourcePiece[], random: Random = Math.random): MemoryCard[] {
  if (pieces.length < 24) throw new Error("Memory mode needs at least 24 images");
  const selected = shuffle(pieces, random).slice(0, 24);
  const pairs = shuffle(selected.flatMap((piece, pairId) => [
    { id: pairId * 2, pairId, src: piece.src, free: false },
    { id: pairId * 2 + 1, pairId, src: piece.src, free: false },
  ]), random);
  pairs.splice(24, 0, { id: 48, pairId: -1, src: "", free: true });
  return pairs;
}

export function timeScore(elapsedMs: number, mistakes = 0, base = 5000): number {
  return Math.max(100, Math.round(base - elapsedMs / 25 - mistakes * 100));
}

export function montageScore(found: number, mistakes = 0): number {
  return Math.max(0, found * 500 - mistakes * 25);
}
