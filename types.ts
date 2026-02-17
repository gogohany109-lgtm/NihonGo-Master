export interface WordBreakdown {
  word: string;
  romaji: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentence: string;
}

export interface KanjiDetail {
  character: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

export interface DictionaryEntry {
  word: string;
  reading: string;
  romaji: string;
  meanings: string[];
  partOfSpeech: string;
  jlptLevel?: string;
  kanjiBreakdown?: KanjiDetail[];
  usageNotes?: string;
  exampleSentences: { ja: string; en: string }[];
}

export interface TranslationResult {
  japanese: string;
  romaji: string;
  pronunciation: string;
  englishMeaning: string;
  tone: 'Casual' | 'Polite' | 'Formal/Keigo';
  culturalNote?: string;
  breakdown: WordBreakdown[];
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export interface HistoryItem {
  id: string;
  originalText: string;
  result: TranslationResult;
  timestamp: number;
}

export interface PronunciationResult {
  score: number;
  transcript: string;
  feedback: string;
}

export enum AppState {
  IDLE,
  TRANSLATING,
  SUCCESS,
  ERROR,
  DICTIONARY_LOADING
}