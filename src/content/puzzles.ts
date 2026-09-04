export interface PuzzleCharacter {
  id: string;
  name: string;
  folder: string;
  preview: string;
  pieces: readonly string[];
  columns: 3;
  rows: 3 | 4;
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
const jaepiMontageModules = import.meta.glob<string>(
  "/optimized/montage/jaepi/*.webp",
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
  character("bb", "BB", "Bb"),
  character("ha", "Ha", "Ha"),
  character("hoo", "Hoo", "Hoo"),
  character("ja", "Ja", "Ja"),
  character("pino", "Pino", "Pino"),
  character("tapee", "Tapee", "Tapee"),
  character("tepee", "Tepee", "Tepee"),
];

export const ALL_PIECES = PUZZLE_CHARACTERS.flatMap((entry) =>
  // Natural filename order maps 1..9/12 to left-to-right, top-to-bottom cells.
  entry.pieces.map((src, pieceIndex) => ({ characterId: entry.id, pieceIndex, src })),
);

export const PICTURE_PIECES_TIME_LIMIT_MS = 60_000;
export const PICTURE_PIECES_SCORE_BANDS = [
  { maxMs: 10_000, score: 1500 },
  { maxMs: 20_000, score: 1200 },
  { maxMs: 30_000, score: 900 },
  { maxMs: 45_000, score: 600 },
  { maxMs: PICTURE_PIECES_TIME_LIMIT_MS, score: 300 },
] as const;

export const MEMORY_REVEAL_DELAY_MS = {
  match: 250,
  mismatch: 450,
} as const;

const jaepiAnswer = jaepiMontageModules["/optimized/montage/jaepi/answer.webp"];
const jaepiVariations = Object.entries(jaepiMontageModules)
  .filter(([path]) => path.includes("/variation-"))
  .sort(([a], [b]) => natural.compare(a, b))
  .map(([, url]) => url);

if (!jaepiAnswer || jaepiVariations.length !== 16) {
  throw new Error("Montage Hunt requires one Jaepi answer and 16 variations");
}

export const MONTAGE_JAEPI = {
  name: "Jaepi",
  answer: jaepiAnswer,
  variations: jaepiVariations,
} as const;
