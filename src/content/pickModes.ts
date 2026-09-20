export type PickMode = "unit" | "montage" | "memory";

export const PICK_MODES: Record<PickMode, { title: string; description: string; note: string }> = {
  unit: { title: "PUZZLE", description: "Find every puzzle piece.", note: "7×7 · 5 hearts" },
  montage: { title: "PORTRAIT", description: "Find the matching face.", note: "2×2 → 5×5 · 5 hearts" },
  memory: { title: "POSITION", description: "Flip cards. Match pairs.", note: "2×2 → 4×4 → 6×6 · 3 stages" },
};
