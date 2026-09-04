import { decomposeAlphabetTarget } from "../core/hangul/alphabetGame";

export interface SentencePrompt {
  id: string;
  text: string;
  translation: string;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  tags?: readonly string[];
}

export interface AlphabetLevel {
  id: string;
  number: number;
  name: string;
  durationMs: number;
  trapChance: number;
  sequence: readonly string[];
  tapGroups: readonly (readonly string[])[];
  pool: readonly string[];
  trapPool?: readonly string[];
  randomizeTargets?: boolean;
}

export interface AlphabetCourse {
  id: "consonants" | "vowels" | "syllables";
  name: string;
  description: string;
  levels: readonly AlphabetLevel[];
}

const CONSONANT_SOUNDS: Readonly<Record<string, string>> = {
  "ㄱ": "[k] / [ɡ]", "ㄴ": "[n]", "ㄷ": "[t] / [d]", "ㄹ": "[ɾ] / [l]", "ㅁ": "[m]", "ㅂ": "[p] / [b]", "ㅅ": "[s] / [ɕ]",
  "ㅇ": "∅ / [ŋ]", "ㅈ": "[tɕ] / [dʑ]", "ㅊ": "[tɕʰ]", "ㅋ": "[kʰ]", "ㅌ": "[tʰ]", "ㅍ": "[pʰ]", "ㅎ": "[h]",
};
const VOWEL_SOUNDS: Readonly<Record<string, string>> = {
  "ㅏ": "[a]", "ㅑ": "[ja]", "ㅓ": "[ʌ]", "ㅕ": "[jʌ]", "ㅗ": "[o]", "ㅛ": "[jo]", "ㅜ": "[u]", "ㅠ": "[ju]", "ㅡ": "[ɯ]", "ㅣ": "[i]",
};
const SYLLABLE_MEANINGS: Readonly<Record<string, string>> = {
  "나": "I", "너": "you", "몸": "body", "피": "blood", "눈": "eye", "코": "nose", "입": "mouth", "손": "hand", "발": "foot",
  "집": "home", "일": "work", "밥": "meal", "옷": "clothes", "잠": "sleep", "땅": "earth", "물": "water", "불": "fire", "비": "rain",
  "산": "mountain", "강": "river", "해": "sun", "달": "moon", "별": "star", "힘": "strength", "꾀": "wits", "꿈": "dream",
  "개": "dog", "소": "cow", "말": "horse", "닭": "chicken", "술": "drink", "춤": "dance",
};

export function alphabetTargetNote(courseId: AlphabetCourse["id"], target: string): string {
  const values = [...target].map((character) => courseId === "consonants"
    ? CONSONANT_SOUNDS[character]
    : courseId === "vowels"
      ? VOWEL_SOUNDS[character]
      : SYLLABLE_MEANINGS[character]);
  return values.filter(Boolean).join(" · ");
}

const BASIC_CONSONANTS = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"];
const CHEONJIIN_TAPS: Readonly<Record<string, readonly string[]>> = {
  "ㅏ": ["ㅣ", "ㆍ"], "ㅑ": ["ㅣ", "ㆍ", "ㆍ"], "ㅓ": ["ㆍ", "ㅣ"], "ㅕ": ["ㆍ", "ㆍ", "ㅣ"],
  "ㅗ": ["ㆍ", "ㅡ"], "ㅛ": ["ㆍ", "ㆍ", "ㅡ"], "ㅜ": ["ㅡ", "ㆍ"], "ㅠ": ["ㅡ", "ㆍ", "ㆍ"],
  "ㅐ": ["ㅣ", "ㆍ", "ㅣ"], "ㅒ": ["ㅣ", "ㆍ", "ㆍ", "ㅣ"], "ㅔ": ["ㆍ", "ㅣ", "ㅣ"], "ㅖ": ["ㆍ", "ㆍ", "ㅣ", "ㅣ"],
  "ㅘ": ["ㆍ", "ㅡ", "ㅣ", "ㆍ"], "ㅙ": ["ㆍ", "ㅡ", "ㅣ", "ㆍ", "ㅣ"], "ㅚ": ["ㆍ", "ㅡ", "ㅣ"],
  "ㅝ": ["ㅡ", "ㆍ", "ㆍ", "ㅣ"], "ㅞ": ["ㅡ", "ㆍ", "ㆍ", "ㅣ", "ㅣ"], "ㅟ": ["ㅡ", "ㆍ", "ㅣ"], "ㅢ": ["ㅡ", "ㅣ"],
  "ㅡ": ["ㅡ"], "ㅣ": ["ㅣ"], "ㆍ": ["ㆍ"],
};
const consonantTaps = (labels: readonly string[]): readonly (readonly string[])[] => labels.map((label) => [...label]);
const vowelTaps = (labels: readonly string[]): readonly (readonly string[])[] => labels.map((label) => [...label].flatMap((vowel) => CHEONJIIN_TAPS[vowel] ?? [vowel]));
const syllableTaps = (labels: readonly string[]): readonly (readonly string[])[] => labels.map((label) =>
  [...label].flatMap(decomposeAlphabetTarget).flatMap((jamo) => CHEONJIIN_TAPS[jamo] ?? [jamo]),
);
const level = (number: number, name: string, durationMs: number, trapChance: number, sequence: readonly string[], tapGroups: readonly (readonly string[])[], pool: readonly string[], trapPool?: readonly string[]): AlphabetLevel => ({
  id: `alphabet-${number}`, number, name, durationMs, trapChance, sequence, tapGroups, pool, ...(trapPool ? { trapPool } : {}),
});

const CONSONANT_LEVELS: readonly AlphabetLevel[] = [
  level(1, "Basic Order", 60_000, .15, ["ㄱㄴㄷㄹㅁ", "ㅂㅅㅇㅈㅊ", "ㅋㅌㅍㅎ"], consonantTaps(["ㄱㄴㄷㄹㅁ", "ㅂㅅㅇㅈㅊ", "ㅋㅌㅍㅎ"]), BASIC_CONSONANTS),
  level(2, "Added Strokes", 75_000, .18, ["ㄱㅋ", "ㄴㄷㄹ", "ㅁㅂㅍ", "ㅅㅈㅊ", "ㅇㅎ"], consonantTaps(["ㄱㅋ", "ㄴㄷㄹ", "ㅁㅂㅍ", "ㅅㅈㅊ", "ㅇㅎ"]), BASIC_CONSONANTS),
  { ...level(3, "Short Memory", 70_000, .20, ["ㄷㅁㅎ", "ㅋㅅㄹㅈ", "ㅎㄹㅊㅂㅇ"], consonantTaps(["ㄷㅁㅎ", "ㅋㅅㄹㅈ", "ㅎㄹㅊㅂㅇ"]), BASIC_CONSONANTS), randomizeTargets: true },
];

const VOWEL_LEVEL_SEQUENCES = [
  ["ㅏ", "ㅓ", "ㅗ", "ㅜ"],
  ["ㅑ", "ㅕ", "ㅛ", "ㅠ"],
  ["ㅏㅑ", "ㅓㅕ", "ㅗㅛ", "ㅜㅠ"],
  ["ㅗㅏ", "ㅠㅓㅑ", "ㅕㅜㅏㅛ", "ㅑㅗㅠㅓㅡ"],
] as const;
const VOWEL_LEVELS: readonly AlphabetLevel[] = VOWEL_LEVEL_SEQUENCES.map((sequence, index) =>
  level(index + 5, ["One Dot", "Two Dots", "Vowel Families", "Vowel Memory"][index]!, [50_000, 60_000, 75_000, 100_000][index]!, .10, sequence, vowelTaps(sequence), ["ㆍ", "ㅡ", "ㅣ"], ["╱", "^", "!", "@"]),
);

const SYLLABLE_LEVEL_SEQUENCES = [
  ["나", "너"],
  ["몸", "피", "눈", "코", "입", "손", "발"],
  ["집", "일", "밥", "옷", "잠"],
  ["땅", "물", "불", "비", "산", "강", "해", "달", "별"],
  ["힘", "꾀", "꿈", "개", "소", "말", "닭", "술", "춤"],
] as const;
const SYLLABLE_LEVELS: readonly AlphabetLevel[] = SYLLABLE_LEVEL_SEQUENCES.map((sequence, index) => {
  const tapGroups = syllableTaps(sequence);
  return level(index + 9, ["Me and You", "My Body", "Daily Life", "Nature", "Strong Finish"][index]!, [45_000, 120_000, 100_000, 170_000, 180_000][index]!, [.14, .16, .18, .20, .22][index]!, sequence, tapGroups, [...new Set(tapGroups.flat())]);
});

export const ALPHABET_COURSES: readonly AlphabetCourse[] = [
  { id: "consonants", name: "Consonants", description: "Lv.1–3 · order, added strokes", levels: CONSONANT_LEVELS },
  { id: "vowels", name: "Vowels", description: "Lv.5–8 · build vowels with ㆍ ㅡ ㅣ", levels: VOWEL_LEVELS },
  { id: "syllables", name: "Syllables", description: "Lv.9–13 · people, body, life, nature, and more", levels: SYLLABLE_LEVELS },
];

export interface SentenceLevel {
  id: string;
  name: string;
  description: string;
  targetMs: number;
  prompts: readonly SentencePrompt[];
}

type TranslatedPrompt = readonly [text: string, translation: string];
const prompts = (level: number, values: readonly TranslatedPrompt[]): readonly SentencePrompt[] =>
  values.map(([text, translation], index) => ({ id: `sentence-${level}-${index + 1}`, text, translation, difficulty: Math.max(1, level) as SentencePrompt["difficulty"] }));

/** Eight sequential Sentence Copy lessons. targetMs is the five-phrase OH MY GOD cutoff. */
export const SENTENCE_LEVELS: readonly SentenceLevel[] = [
  { id: "level-1", name: "Lv.1", description: "Short everyday phrases", targetMs: 90_000, prompts: prompts(1, [["안녕!", "Hello!"], ["잘 가!", "Goodbye!"], ["고마워!", "Thank you!"], ["미안해!", "I'm sorry!"], ["또 만나!", "See you again!"]]) },
  { id: "level-2", name: "Lv.2", description: "Particles and polite endings", targetMs: 120_000, prompts: prompts(2, [["저는 학생이에요.", "I am a student."], ["학교에 가요.", "I go to school."], ["친구를 만나요.", "I meet a friend."], ["책을 읽어요.", "I read a book."], ["집에서 쉬어요.", "I rest at home."]]) },
  { id: "level-3", name: "Lv.3", description: "Formal polite endings", targetMs: 150_000, prompts: prompts(3, [["반갑습니다.", "Nice to meet you."], ["감사합니다.", "Thank you."], ["저는 학생입니다.", "I am a student."], ["학교에 갑니다.", "I go to school."], ["책을 읽습니다.", "I read a book."]]) },
  { id: "level-4", name: "Lv.4", description: "Tense, negatives, and honorifics", targetMs: 180_000, prompts: prompts(4, [["어제 공부했습니다.", "I studied yesterday."], ["오늘 학교에 가지 않아요.", "I am not going to school today."], ["선생님께서 오십니다.", "The teacher is coming."], ["내일 친구를 만날 거예요.", "I will meet a friend tomorrow."], ["저는 매운 음식을 못 먹어요.", "I cannot eat spicy food."]]) },
  { id: "level-5", name: "Lv.5", description: "Adjectives, adverbs, and connectors", targetMs: 210_000, prompts: prompts(5, [["오늘 날씨가 아주 좋아요.", "The weather is very nice today."], ["이 가방은 정말 가벼워요.", "This bag is really light."], ["천천히 또박또박 말해요.", "Speak slowly and clearly."], ["피곤하지만 숙제를 했어요.", "I was tired, but I did my homework."], ["비가 와서 길이 미끄러워요.", "The road is slippery because it is raining."]]) },
  { id: "level-6", name: "Lv.6", description: "Practical complex sentences", targetMs: 240_000, prompts: prompts(6, [["시간이 있으면 같이 만나요.", "If you have time, let's meet."], ["길을 모르면 물어보세요.", "If you do not know the way, please ask."], ["식사가 끝난 후에 연락해 주세요.", "Please contact me after the meal."], ["비가 와도 약속 장소에 갈 거예요.", "Even if it rains, I will go to the meeting place."], ["배울수록 자신감이 생겨요.", "The more I learn, the more confident I become."]]) },
];

export const SENTENCE_PROMPTS: readonly SentencePrompt[] = SENTENCE_LEVELS.flatMap((level) => level.prompts);

export interface WordTarget {
  id: string;
  word: string;
  translation: string;
}

export interface WordLevel {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  targets: readonly WordTarget[];
}

const wordTargets = (level: number, values: readonly (readonly [word: string, translation: string])[]): readonly WordTarget[] =>
  values.map(([word, translation], index) => ({ id: `word-${level}-${index + 1}`, word, translation }));

/** Five three-word lessons, moving from simple words to expressive Korean and compound vowels. */
export const WORD_LEVELS: readonly WordLevel[] = [
  { id: "word-beginner", name: "Beginner", description: "Words without final consonants", durationMs: 60_000, targets: wordTargets(0, [["아기", "baby"], ["나비", "butterfly"], ["우유", "milk"], ["모자", "hat"], ["누나", "older sister"], ["오빠", "older brother"]]) },
  { id: "word-1", name: "Lv.1", description: "Words with final consonants", durationMs: 75_000, targets: wordTargets(1, [["사랑", "love"], ["친구", "friend"], ["공부", "study"], ["학교", "school"], ["행복", "happiness"], ["가족", "family"]]) },
  { id: "word-2", name: "Lv.2", description: "Everyday exclamations", durationMs: 90_000, targets: wordTargets(2, [["어머나", "oh my"], ["아이고", "oh dear"], ["아뿔사", "oops"], ["저기요", "excuse me"], ["앗뜨거", "ouch, hot"], ["엄마야", "oh my gosh"], ["깜짝이야", "what a surprise"]]) },
  { id: "word-3", name: "Lv.3", description: "Sounds and movement words", durationMs: 100_000, targets: wordTargets(3, [["쿵", "thump"], ["쾅", "bang"], ["꽥", "squawk"], ["짹짹", "chirp chirp"], ["엉금엉금", "crawl slowly"], ["어슬렁어슬렁", "wander around"]]) },
  { id: "word-4", name: "Lv.4", description: "Compound-vowel words", durationMs: 90_000, targets: wordTargets(4, [["개", "dog"], ["게", "crab"], ["내", "my"], ["네", "yes"], ["왜", "why"], ["와", "come"], ["꾀", "wits"], ["외", "outside"]]) },
];

export const WORD_TARGETS: readonly WordTarget[] = WORD_LEVELS.flatMap((level) => level.targets);
