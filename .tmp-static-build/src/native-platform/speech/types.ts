/**
 * Speech Recognition contract — voice-to-text only.
 *
 * This module never records, stores, or uploads audio. It emits text.
 */

export interface SpeechResult {
  /** Recognized text. */
  transcript: string;
  /** False while the engine may still revise this text. */
  isFinal: boolean;
  /** Engine confidence 0..1 when reported. */
  confidence: number | null;
}

export interface SpeechOptions {
  /** BCP-47 tag, e.g. "ar-SA", "en-US". Default "ar-SA". */
  language?: string;
  /** Emit interim text as the user speaks. Default `true`. */
  partialResults?: boolean;
  /** Keep listening across pauses until `stopListening()`. Default `false`. */
  continuous?: boolean;
  /** Insert punctuation where the engine supports it. Default `true`. */
  addPunctuation?: boolean;
}

export interface SpeechSession {
  /** Fires for interim and final results. */
  onResult: (listener: (result: SpeechResult) => void) => () => void;
  /** Fires once when the engine stops for any reason. */
  onEnd: (listener: () => void) => () => void;
  /** Fires on engine failure. */
  onError: (listener: (error: unknown) => void) => () => void;
  /** Stop listening and resolve with the accumulated final transcript. */
  stop: () => Promise<string>;
}

export const DEFAULT_LANGUAGE = "ar-SA";

/** Languages the application ships UI for. Any BCP-47 tag is accepted. */
export const SUPPORTED_LANGUAGES = ["ar-SA", "en-US"] as const;
