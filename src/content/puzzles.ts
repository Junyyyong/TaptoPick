export interface PuzzleCharacter {
  id: string;
  name: string;
  folder: string;
  preview: string;
  pieces: readonly string[];
  columns: 3;
  rows: 3 | 4;
}

export interface MontageCharacter {
  id: string;
  name: string;
  answer: string;
  variations: readonly string[];
  easyVariations: readonly number[];
  hardVariations: readonly number[];
}

const pieceModules = import.meta.glob<string>(
  [
    "/optimized/Bb/*.webp",
    "/optimized/Ha/*.webp",
    "/optimized/Hoo/*.webp",
    "/optimized/Ja/*.webp",
    "/optimized/Pino/*.webp",
    "/optimized/Tapee/*.webp",
    "/optimized/Tepee/*.webp",
  ],
  { eager: true, query: "?url", import: "default" },
);

const unitPreviewModules = import.meta.glob<string>("/optimized/unit/*.webp", { eager: true, query: "?url", import: "default" });
const montageModules = import.meta.glob<string>(
  [
    "/optimized/montage/haepi/*.webp",
    "/optimized/montage/bbogles/*.webp",
    "/optimized/montage/tapee/*.webp",
    "/optimized/montage/tepee/*.webp",
    "/optimized/montage/hupi/*.webp",
    "/optimized/montage/jaepi/*.webp",
    "/optimized/montage/pino/*.webp",
  ],
  { eager: true, query: "?url", import: "default" },
);

const natural = new Intl.Collator("en", { numeric: true });

function character(id: string, name: string, folder: string): PuzzleCharacter {
  const files = Object.entries(pieceModules)
    .filter(([path]) => path.startsWith(`/optimized/${folder}/`))
    .sort(([a], [b]) => natural.compare(a, b));
  const pieces = files.map(([, url]) => url);

  if (pieces.length !== 9 && pieces.length !== 12) {
    throw new Error(`${folder} must contain either 9 or 12 numbered JPG pieces`);
  }
  const preview = unitPreviewModules[`/optimized/unit/${folder}.webp`];
  if (!preview) throw new Error(`Missing unit preview: ${folder}.webp`);

  return {
    id,
    name,
    folder,
    preview,
    pieces,
    columns: 3,
    rows: pieces.length === 9 ? 3 : 4,
  };
}

export const PUZZLE_CHARACTERS: readonly PuzzleCharacter[] = [
  character("bb", "Bbogles", "Bb"),
  character("ha", "Hapee", "Ha"),
  character("hoo", "Hooopee", "Hoo"),
  character("ja", "Zapee", "Ja"),
  character("pino", "PinoPan", "Pino"),
  character("tapee", "Tapee", "Tapee"),
  character("tepee", "Tepee", "Tepee"),
];

export const ALL_PIECES = PUZZLE_CHARACTERS.flatMap((entry) =>
  // Natural filename order maps 1..9/12 to left-to-right, top-to-bottom cells.
  entry.pieces.map((src, pieceIndex) => ({ characterId: entry.id, pieceIndex, src })),
);

export const PICTURE_PIECES_SCORE_BANDS = [
  { maxMs: 10_000, score: 1500 },
  { maxMs: 20_000, score: 1200 },
  { maxMs: 30_000, score: 900 },
  { maxMs: 45_000, score: 600 },
  { maxMs: Infinity, score: 300 },
] as const;

export const MEMORY_REVEAL_DELAY_MS = {
  match: 250,
  mismatch: 450,
} as const;

// Filename numbers, visually reviewed: large color/orientation changes vs small facial details.
const MONTAGE_DIFFICULTY: Record<string, { easy: number[]; hard: number[] }> = {
  haepi: { easy: [18,19,20,21,22,23,26,27], hard: [8,9,10,11,12,13,14,15,24] },
  bbogles: { easy: [2,3,4,14,15,16], hard: [5,6,7,9,12,13,17,18,20] },
  tapee: { easy: [1,4,5,6,7,9,14,16,17,18,19,20], hard: [2,3,8,11,12,15] },
  tepee: { easy: [1,2,3,10,14,15,16,17,20], hard: [4,5,8,9,13,19] },
  hupi: { easy: [1,2,3,4,7,8,11,12,16], hard: [5,6,9,14,15,17,18] },
  jaepi: { easy: [1,2,5,7,8,10,11,14,15], hard: [3,4,9,12,13,16] },
  pino: { easy: [1,2,3,4,7,9,12,17,18], hard: [5,6,8,10,11,13,14,15,16] },
};

function montageCharacter(id: string, name: string, expectedVariations: number): MontageCharacter {
  const basePath = `/optimized/montage/${id}`;
  const answer = montageModules[`${basePath}/answer.webp`];
  const entries = Object.entries(montageModules)
    .filter(([path]) => path.startsWith(`${basePath}/variation-`))
    .sort(([a], [b]) => natural.compare(a, b));
  const variations = entries.map(([, url]) => url);
  const indicesFor = (numbers: number[]) => numbers.map((number) => {
    const index = entries.findIndex(([path]) => Number(path.match(/variation-(\d+)\.webp$/)?.[1]) === number);
    if (index < 0) throw new Error(`Missing difficulty variation ${id}/${number}`);
    return index;
  });

  if (!answer || variations.length !== expectedVariations) {
    throw new Error(`Montage Hunt requires one ${name} answer and ${expectedVariations} variations`);
  }
  return { id, name, answer, variations, easyVariations: indicesFor(MONTAGE_DIFFICULTY[id]!.easy), hardVariations: indicesFor(MONTAGE_DIFFICULTY[id]!.hard) };
}

export const MONTAGE_CHARACTERS: readonly MontageCharacter[] = [
  montageCharacter("haepi", "Haepi", 20),
  montageCharacter("bbogles", "Bbogles", 20),
  montageCharacter("tapee", "Tapee", 20),
  montageCharacter("tepee", "Tepee", 20),
  montageCharacter("hupi", "Hupi", 18),
  montageCharacter("jaepi", "Jaepi", 16),
  montageCharacter("pino", "Pino Pan", 18),
];

export const GAME_IMAGE_URLS = [
  ...PUZZLE_CHARACTERS.map((character) => character.preview),
  ...MONTAGE_CHARACTERS.map((character) => character.answer),
  ...ALL_PIECES.map((piece) => piece.src),
  ...MONTAGE_CHARACTERS.flatMap((character) => character.variations),
] as const;

// Memory uses only the seven original faces, never montage variations.
export const MEMORY_FACES = MONTAGE_CHARACTERS.map((character) => character.answer);
export const MEMORY_PREVIEW_MS = 3_000;
