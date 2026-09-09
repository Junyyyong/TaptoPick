import { MONTAGE_CHARACTERS, PUZZLE_CHARACTERS } from "./puzzles";
import { PICK_MODES } from "./pickModes";
import type { PracticeMode, PracticeTile } from "../core/pick/tutorial";

export interface PracticeExample {
  mode: PracticeMode; title: string; instruction: string; rule: string;
  name?: string; preview?: string; tiles: PracticeTile[];
  pieceIndices?: readonly number[];
}
const unit = PUZZLE_CHARACTERS.find(c => c.id === "tepee")!;
const face = MONTAGE_CHARACTERS.find(c => c.id === "tapee")!;
const other = MONTAGE_CHARACTERS.find(c => c.id === "tepee")!;
export const PRACTICE_EXAMPLES: readonly PracticeExample[] = [
  { mode: "unit", title: PICK_MODES.unit.title, instruction: "Find these 4 sample pieces of this character. Follow the glowing pieces.",
    rule: "In the game: find every piece on a 7×7 board. You have 5 hearts and no time limit.", name: unit.displayName, preview: unit.preview,
    pieceIndices: [1,4,5,7],
    tiles: [...[1,4,5,7].map(index => ({src:unit.pieces[index]!, key:unit.id, target:true})),
      ...PUZZLE_CHARACTERS.filter(c=>c.id!==unit.id).slice(0,5).map(c=>({src:c.pieces[4]!,key:c.id,target:false}))] },
  { mode: "montage", title: PICK_MODES.montage.title, instruction: "Tap the one face that matches exactly. Look at the eyes, mouth and hat.",
    rule: "In the game: advance from 2×2 to 5×5. You have 5 hearts. Two tiles swap in the final stage.", name:face.displayName, preview:face.answer,
    tiles: [{src:face.answer,key:"answer",target:true}, ...face.easyVariations.slice(0,3).map(i=>({src:face.variations[i]!,key:`wrong-${i}`,target:false}))] },
  { mode: "memory", title: PICK_MODES.memory.title, instruction: "Flip two cards. Find both matching pairs. Different faces turn back over.",
    rule: "In the game: clear 4×4 through 7×7 with a timer for each stage. There are no hearts.",
    tiles:[face,other].flatMap(c=>[0,1].map(()=>({src:c.answer,key:c.id,target:true}))) },
];
