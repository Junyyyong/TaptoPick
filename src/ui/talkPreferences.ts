export interface TalkPreferences {
  soundOn: boolean;
  hapticsOn: boolean;
  tutorialDone: boolean;
}

const KEY = "taptotalk.preferences.v1";
const DEFAULTS: TalkPreferences = { soundOn: true, hapticsOn: true, tutorialDone: false };

export function loadTalkPreferences(): TalkPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<TalkPreferences>;
    return {
      soundOn: value.soundOn !== false,
      hapticsOn: value.hapticsOn !== false,
      tutorialDone: value.tutorialDone === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveTalkPreferences(preferences: TalkPreferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing may block storage; the current session still works.
  }
}
