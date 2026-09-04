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
  mutations: readonly MontageMutation[];
}

export interface MontageMutation {
  pieceIndex: number;
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
  ["scaleX(-1)", "none"],
  ["translateX(15%) scale(1.08)", "none"],
  ["translateY(-15%) scale(1.08)", "none"],
  ["rotate(12deg) scale(1.14)", "none"],
  ["scale(1)", "hue-rotate(85deg) saturate(1.45)"],
  ["scale(1)", "hue-rotate(-105deg) saturate(1.4)"],
  ["scale(1)", "grayscale(1) contrast(1.25)"],
  ["scale(1)", "sepia(1) saturate(2.2) contrast(1.15)"],
] as const;

export function createMontageBoard(pieceIndices: readonly number[], size = 49, random: Random = Math.random): MontageTile[] {
  if (!pieceIndices.length) throw new Error("Montage mode needs at least one feature piece");
  const exactIndex = Math.floor(random() * size);
  return Array.from({ length: size }, (_, id) => {
    if (id === exactIndex) return { id, exact: true, mutations: [] };
    const variantIndex = (id + exactIndex) % MONTAGE_VARIANTS.length;
    const variant = MONTAGE_VARIANTS[variantIndex]!;
    const primaryPiece = pieceIndices[(id * 5 + exactIndex) % pieceIndices.length]!;
    const mutations: MontageMutation[] = [{ pieceIndex: primaryPiece, transform: variant[0], filter: variant[1] }];

    if ((id + exactIndex) % 3 === 0 && pieceIndices.length > 1) {
      const secondaryPiece = pieceIndices[(id * 5 + exactIndex + 1) % pieceIndices.length]!;
      const secondaryVariant = MONTAGE_VARIANTS[(variantIndex + 4) % MONTAGE_VARIANTS.length]!;
      mutations.push({ pieceIndex: secondaryPiece, transform: secondaryVariant[0], filter: secondaryVariant[1] });
    }
    return { id, exact: false, mutations };
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
