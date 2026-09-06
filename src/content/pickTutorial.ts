import { MONTAGE_CHARACTERS, PUZZLE_CHARACTERS } from "./puzzles";
import type { PracticeMode, PracticeTile } from "../core/pick/tutorial";

export interface PracticeExample {
  mode: PracticeMode; title: string; instruction: string; rule: string;
  name?: string; preview?: string; tiles: PracticeTile[];
}
const unit = PUZZLE_CHARACTERS.find(c => c.id === "tepee")!;
const face = MONTAGE_CHARACTERS.find(c => c.id === "tapee")!;
const other = MONTAGE_CHARACTERS.find(c => c.id === "tepee")!;
export const PRACTICE_EXAMPLES: readonly PracticeExample[] = [
  { mode: "unit", title: "Picture Pieces", instruction: "Find all 9 pieces of this character. Follow the glowing pieces.",
    rule: "In the game: find every piece on a 7×7 board. You have 5 hearts and no time limit.", name: unit.displayName, preview: unit.preview,
    tiles: unit.pieces.map(src => ({src, key:unit.id, target:true})) },
  { mode: "montage", title: "Montage Hunt", instruction: "Tap the one face that matches exactly. Look at the eyes, mouth and hat.",
    rule: "In the game: advance from 2×2 to 5×5. You have 5 hearts. Two tiles swap in the final stage.", name:face.displayName, preview:face.answer,
    tiles: [{src:face.answer,key:"answer",target:true}, ...face.easyVariations.slice(0,3).map(i=>({src:face.variations[i]!,key:`wrong-${i}`,target:false}))] },
  { mode: "memory", title: "Pair Memory", instruction: "Flip two cards. Find both matching pairs. Different faces turn back over.",
    rule: "In the game: clear 4×4 through 7×7 with a timer for each stage. There are no hearts.",
    tiles:[face,other].flatMap(c=>[0,1].map(()=>({src:c.answer,key:c.id,target:true}))) },
];
