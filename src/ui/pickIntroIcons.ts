import type { PickMode } from "../content/pickModes";

const icon = (paths: string): string => `<svg viewBox="0 0 48 48" width="86" height="86" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const PICK_INTRO_ICONS: Record<PickMode, string> = {
  unit: icon('<rect x="5" y="17" width="26" height="26" rx="3"/><path d="M18 17v26M5 30h26"/><rect x="30" y="5" width="13" height="13" rx="3"/>'),
  montage: icon('<circle cx="21" cy="21" r="15"/><path d="m32 32 11 11M15 24q6 7 12 0"/><circle cx="16" cy="18" r="1" fill="currentColor"/><circle cx="26" cy="18" r="1" fill="currentColor"/>'),
  memory: icon('<rect x="5" y="6" width="24" height="31" rx="4"/><rect x="19" y="12" width="24" height="31" rx="4" fill="var(--cool)"/><path d="m31 20 2.5 5 5.5.8-4 4 .9 5.5L31 33l-4.9 2.3.9-5.5-4-4 5.5-.8Z"/>'),
};
