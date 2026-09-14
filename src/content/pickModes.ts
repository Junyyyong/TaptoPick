export type PickMode = "unit" | "montage" | "memory";

export const PICK_MODES: Record<PickMode, { title: string; description: string; note: string }> = {
  unit: { title: "PUZZLE", description: "Find every puzzle piece.", note: "7×7 · 5 hearts" },
  montage: { title: "MONTAGE", description: "Find the matching face.", note: "2×2 → 5×5 · 5 hearts" },
  memory: { title: "MEMORY", description: "Flip cards. Match pairs.", note: "4×4 → 7×7 · 4 stages" },
};
