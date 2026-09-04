export interface PuzzleCharacter {
  id: string;
  name: string;
  folder: string;
  preview?: string;
  pieces: readonly string[];
  montagePieces: readonly number[];
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

function character(id: string, name: string, folder: string, montagePieces: readonly number[]): PuzzleCharacter {
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
    montagePieces,
    columns: 3,
    rows: pieces.length === 9 ? 3 : 4,
  };
}

export const PUZZLE_CHARACTERS: readonly PuzzleCharacter[] = [
  character("bb", "BB", "Bb", [0, 1, 3, 4]),
  character("ha", "Ha", "Ha", [0, 1, 2, 3, 4, 5]),
  character("hoo", "Hoo", "Hoo", [3, 4, 5, 6, 7]),
  character("ja", "Ja", "Ja", [0, 1, 3, 4, 5]),
  character("pino", "Pino", "Pino", [0, 1, 2, 3, 4, 5]),
  character("tapee", "Tapee", "Tapee", [0, 1, 2, 3, 4, 5]),
  character("tepee", "Tepee", "Tepee", [0, 1, 2, 3, 4, 5]),
];

export const ALL_PIECES = PUZZLE_CHARACTERS.flatMap((entry) =>
  // Natural filename order maps 1..9/12 to left-to-right, top-to-bottom cells.
  entry.pieces.map((src, pieceIndex) => ({ characterId: entry.id, pieceIndex, src })),
);
