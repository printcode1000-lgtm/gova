/**
 * Compatibility shim over the Native Platform Speech Recognition module.
 *
 * The voice-input scanner consumes this narrow, single-shot interface.
 * All engine handling now lives in `src/native-platform/speech`; this file
 * only adapts the shape and must not import a Capacitor plugin.
 */

import {
  speechRecognition,
  type SpeechOptions,
} from "@/native-platform/speech";

export type SpeechRecognitionLanguage = "ar-SA" | "en-US";

export interface SpeechRecognitionAdapter {
  isAvailable(): Promise<boolean>;
  start(language: SpeechRecognitionLanguage): Promise<string>;
  stop(): Promise<void>;
}

class NativePlatformSpeechAdapter implements SpeechRecognitionAdapter {
  isAvailable(): Promise<boolean> {
    return speechRecognition.isAvailable();
  }

  start(language: SpeechRecognitionLanguage): Promise<string> {
    const options: SpeechOptions = {
      language,
      // The legacy contract resolves once with the final transcript.
      partialResults: false,
      continuous: false,
      addPunctuation: true,
    };
    return speechRecognition.transcribeOnce(options);
  }

  async stop(): Promise<void> {
    await speechRecognition.stopListening();
  }
}

export function createSpeechRecognitionAdapter(): SpeechRecognitionAdapter {
  return new NativePlatformSpeechAdapter();
}
