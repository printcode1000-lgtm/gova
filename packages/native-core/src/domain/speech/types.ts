export type SpeechRecognitionLanguage = "ar-SA" | "en-US" | string;

export interface SpeechOptions {
  language?: SpeechRecognitionLanguage;
  maxResults?: number;
  prompt?: string;
  partialResults?: boolean;
  popup?: boolean;
  continuous?: boolean;
  addPunctuation?: boolean;
}

export interface SpeechRecognitionResult {
  matches: readonly string[];
}
