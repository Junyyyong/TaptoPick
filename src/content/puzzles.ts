export interface PuzzleCharacter {
  id: string;
  name: string;
  folder: string;
  preview?: string;
  pieces: readonly string[];
  columns: 3;
  rows: 3 | 4;
}

const assetModules = import.meta.glob<string>(
  [
    "/Bb/*.{jpg,png}",
    "/Ha/*.{jpg,png}",
    "/Hoo/*.{jpg,png}",
    "/Ja/*.{jpg,png}",
    "/Pino/*.{jpg,png}",
    "/Tapee/*.{jpg,png}",
    "/Tepee/*.{jpg,png}",
  ],
  { eager: true, query: "?url", import: "default" },
);

const natural = new Intl.Collator("en", { numeric: true });

function character(id: string, name: string, folder: string): PuzzleCharacter {
  const files = Object.entries(assetModules)
    .filter(([path]) => path.startsWith(`/${folder}/`))
    .sort(([a], [b]) => natural.compare(a, b));
  const pieces = files.filter(([path]) => path.toLowerCase().endsWith(".jpg")).map(([, url]) => url);

  if (pieces.length !== 9 && pieces.length !== 12) {
    throw new Error(`${folder} must contain either 9 or 12 numbered JPG pieces`);
  }

  return {
    id,
    name,
    folder,
    preview: files.find(([path]) => path.toLowerCase().endsWith(".png"))?.[1],
    pieces,
    columns: 3,
    rows: pieces.length === 9 ? 3 : 4,
  };
}

export const PUZZLE_CHARACTERS: readonly PuzzleCharacter[] = [
  character("bb", "비비", "Bb"),
  character("ha", "해피", "Ha"),
  character("hoo", "후피", "Hoo"),
  character("ja", "재피", "Ja"),
  character("pino", "피노", "Pino"),
  character("tapee", "태피", "Tapee"),
  character("tepee", "티피", "Tepee"),
];

export const ALL_PIECES = PUZZLE_CHARACTERS.flatMap((entry) =>
  // Natural filename order maps 1..9/12 to left-to-right, top-to-bottom cells.
  entry.pieces.map((src, pieceIndex) => ({ characterId: entry.id, pieceIndex, src })),
);
