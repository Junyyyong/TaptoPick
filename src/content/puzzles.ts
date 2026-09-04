export interface PuzzleCharacter {
  id: string;
  name: string;
  folder: string;
  preview?: string;
  montage: string;
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

const montageModules = import.meta.glob<string>(
  ["/Bb.png", "/Ha.png", "/Hooo.png", "/Ja.png", "/Pino.png", "/Tapee.png", "/Tepee.png"],
  { eager: true, query: "?url", import: "default" },
);

const natural = new Intl.Collator("en", { numeric: true });

function character(id: string, name: string, folder: string, montageFile: string): PuzzleCharacter {
  const files = Object.entries(assetModules)
    .filter(([path]) => path.startsWith(`/${folder}/`))
    .sort(([a], [b]) => natural.compare(a, b));
  const pieces = files.filter(([path]) => path.toLowerCase().endsWith(".jpg")).map(([, url]) => url);

  if (pieces.length !== 9 && pieces.length !== 12) {
    throw new Error(`${folder} must contain either 9 or 12 numbered JPG pieces`);
  }
  const montage = montageModules[`/${montageFile}`];
  if (!montage) throw new Error(`Missing montage PNG: ${montageFile}`);

  return {
    id,
    name,
    folder,
    preview: files.find(([path]) => path.toLowerCase().endsWith(".png"))?.[1],
    montage,
    pieces,
    columns: 3,
    rows: pieces.length === 9 ? 3 : 4,
  };
}

export const PUZZLE_CHARACTERS: readonly PuzzleCharacter[] = [
  character("bb", "BB", "Bb", "Bb.png"),
  character("ha", "Ha", "Ha", "Ha.png"),
  character("hoo", "Hoo", "Hoo", "Hooo.png"),
  character("ja", "Ja", "Ja", "Ja.png"),
  character("pino", "Pino", "Pino", "Pino.png"),
  character("tapee", "Tapee", "Tapee", "Tapee.png"),
  character("tepee", "Tepee", "Tepee", "Tepee.png"),
];

export const ALL_PIECES = PUZZLE_CHARACTERS.flatMap((entry) =>
  // Natural filename order maps 1..9/12 to left-to-right, top-to-bottom cells.
  entry.pieces.map((src, pieceIndex) => ({ characterId: entry.id, pieceIndex, src })),
);
