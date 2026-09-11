import type { PickMode } from "../content/pickModes";

const icon = (paths: string): string => `<svg viewBox="0 0 48 48" width="86" height="86" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

// Eyes and mouth only: the card itself supplies the face boundary.
const smileFace = '<path d="M25.5 24q5.5 7 11 0"/><circle cx="26.5" cy="18.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="35.5" cy="18.5" r="1.5" fill="currentColor" stroke="none"/>';

export const PICK_INTRO_ICONS: Record<PickMode, string> = {
  unit: icon('<path d="M10 13H19V10a5 5 0 0 1 10 0v3h6a3 3 0 0 1 3 3v6h-3a5 5 0 0 0 0 10h3v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V16a3 3 0 0 1 3-3Z"/>'),
  montage: icon('<circle cx="21" cy="21" r="15"/><path d="m32 32 11 11M15 24q6 7 12 0"/><circle cx="16" cy="18" r="1" fill="currentColor"/><circle cx="26" cy="18" r="1" fill="currentColor"/>'),
  memory: icon(`<g data-card="back"><rect x="5" y="12" width="24" height="31" rx="4"/><path d="m17 22.5 1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5Z" stroke-width="1.6"/></g><g data-card="front"><rect x="19" y="6" width="24" height="31" rx="4" fill="var(--cool)"/>${smileFace}</g>`),
};
