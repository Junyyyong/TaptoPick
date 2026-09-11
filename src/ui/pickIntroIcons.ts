import type { PickMode } from "../content/pickModes";

const icon = (paths: string): string => `<svg viewBox="0 0 48 48" width="86" height="86" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

// Match the existing Montage face on the face-up memory card.
const smileFace = '<circle cx="21" cy="21" r="15"/><path d="M15 24q6 7 12 0"/><circle cx="16" cy="18" r="1" fill="currentColor"/><circle cx="26" cy="18" r="1" fill="currentColor"/>';

export const PICK_INTRO_ICONS: Record<PickMode, string> = {
  unit: icon('<path transform="translate(-3 2)" d="M10 10H19C17 4 19 2 23 2C27 2 29 4 27 10H38V19C44 17 46 19 46 23C46 27 44 29 38 27V40H28C30 34 28 32 24 32C20 32 18 34 20 40H10V29C16 31 18 29 18 25C18 21 16 19 10 21Z"/>'),
  montage: icon('<circle cx="21" cy="21" r="15"/><path d="m32 32 11 11M15 24q6 7 12 0"/><circle cx="16" cy="18" r="1" fill="currentColor"/><circle cx="26" cy="18" r="1" fill="currentColor"/>'),
  memory: icon(`<g data-card="back"><rect x="5" y="12" width="24" height="31" rx="4"/><path d="m12 23 1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5Z" stroke-width="1.6"/></g><g data-card="front"><rect x="19" y="6" width="24" height="31" rx="4" fill="var(--cool)"/><g transform="translate(19.45 9.45) scale(.55)" stroke-width="3">${smileFace}</g></g>`),
};
