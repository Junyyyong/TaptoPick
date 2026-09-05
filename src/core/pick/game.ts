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

export const MONTAGE_LIMIT_MS = 180_000;

export function createMontageRound(variationCount: number, found: number, random: Random = Math.random): { side: 3 | 4 | 5; tiles: MontageTile[] } {
  const side = found === 0 ? 3 : found === 1 ? 4 : 5;
  return { side, tiles: createMontageBoard(variationCount, side * side, random) };
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

export function createRandomIndexCycle(itemCount: number, previousIndex = -1, random: Random = Math.random): number[] {
  if (itemCount < 1) throw new Error("At least one item is required");
  const indices = Array.from({ length: itemCount }, (_, index) => index);
  if (itemCount === 1 || previousIndex < 0 || previousIndex >= itemCount) return shuffle(indices, random);

  const firstChoices = indices.filter((index) => index !== previousIndex);
  const first = firstChoices[Math.floor(random() * firstChoices.length)]!;
  return [first, ...shuffle(indices.filter((index) => index !== first), random)];
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

export function createMemoryBoard(faces: readonly string[], size: 4 | 5 | 6 | 7 = 4, random: Random = Math.random): MemoryCard[] {
  if (faces.length !== 8 || new Set(faces).size !== 8) throw new Error("Memory mode needs eight distinct faces");
  const pairCount = Math.floor(size * size / 2);
  const faceOrder = shuffle(faces, random);
  const board = shuffle(Array.from({ length: pairCount }, (_, pairId) => faceOrder[pairId % faceOrder.length]!).flatMap((src, pairId) => [
    { id: pairId * 2, pairId, src, free: false },
    { id: pairId * 2 + 1, pairId, src, free: false },
  ]), random);
  if (size % 2) board.splice(pairCount, 0, { id: size * size - 1, pairId: -1, src: "", free: true });
  return board;
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
