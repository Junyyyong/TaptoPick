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
  exact: boolean;
  variationIndex: number;
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

export function pickDifferentIndex(previousIndex: number, itemCount: number, random: Random = Math.random): number {
  if (itemCount < 1) throw new Error("At least one item is required");
  if (itemCount === 1 || previousIndex < 0 || previousIndex >= itemCount) return Math.floor(random() * itemCount);
  const offset = 1 + Math.floor(random() * (itemCount - 1));
  return (previousIndex + offset) % itemCount;
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

export function createMontageBoard(variationCount: number, size = 25, random: Random = Math.random): MontageTile[] {
  if (variationCount < 1) throw new Error("Montage mode needs at least one variation");
  const exactIndex = Math.floor(random() * size);
  const variationIndices = shuffle(Array.from({ length: size - 1 }, (_, index) => index % variationCount), random);
  let variationCursor = 0;
  return Array.from({ length: size }, (_, id) => id === exactIndex
    ? { id, exact: true, variationIndex: -1 }
    : { id, exact: false, variationIndex: variationIndices[variationCursor++]! });
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

export interface TimeScoreBand {
  maxMs: number;
  score: number;
}

export function tieredTimeScore(elapsedMs: number, bands: readonly TimeScoreBand[]): number {
  return bands.find((band) => elapsedMs <= band.maxMs)?.score ?? 0;
}

export function montageScore(found: number, mistakes = 0): number {
  return Math.max(0, found * 500 - mistakes * 25);
}
