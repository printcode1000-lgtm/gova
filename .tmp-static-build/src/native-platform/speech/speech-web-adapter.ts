/**
 * Browser speech-to-text adapter (Web Speech API).
 *
 * Single responsibility: drive `SpeechRecognition`/`webkitSpeechRecognition`
 * and expose the same `SpeechSession` contract as the native adapter.
 */

import { NativePlatformError, toNativeError } from "../core/errors";
import { createEmitter } from "../core/listener";
import { hasDom } from "../core/platform";
import {
  DEFAULT_LANGUAGE,
  type SpeechOptions,
  type SpeechResult,
  type SpeechSession,
} from "./types";

const MODULE = "SpeechRecognition";

interface BrowserRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface BrowserRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: BrowserRecognitionAlternative;
}

interface BrowserRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: BrowserRecognitionResult;
  };
}

interface BrowserRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface BrowserRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: BrowserRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserRecognitionConstructor {
  new (): BrowserRecognition;
}

/**
 * Read the constructor off `window` without declaring a global interface,
 * so this file never conflicts with another module's ambient declaration.
 */
function getConstructor(): BrowserRecognitionConstructor | undefined {
  if (!hasDom()) return undefined;
  const scope = window as unknown as {
    SpeechRecognition?: BrowserRecognitionConstructor;
    webkitSpeechRecognition?: BrowserRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

export async function webIsAvailable(): Promise<boolean> {
  return Boolean(getConstructor());
}

export async function webStartListening(
  options: SpeechOptions,
): Promise<SpeechSession> {
  const Recognition = getConstructor();
  if (!Recognition) {
    throw NativePlatformError.unavailable(
      MODULE,
      "This browser does not support speech recognition.",
    );
  }

  const results = createEmitter<SpeechResult>("speech:result");
  const ends = createEmitter<void>("speech:end");
  const errors = createEmitter<unknown>("speech:error");

  const recognition = new Recognition();
  let finalTranscript = "";
  let stopped = false;

  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = options.partialResults ?? true;
  recognition.lang = options.language ?? DEFAULT_LANGUAGE;

  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const alternative = result[0];
      if (!alternative) continue;
      if (result.isFinal) {
        finalTranscript = `${finalTranscript} ${alternative.transcript}`.trim();
        results.emit({
          transcript: alternative.transcript.trim(),
          isFinal: true,
          confidence: alternative.confidence ?? null,
        });
      } else {
        results.emit({
          transcript: alternative.transcript,
          isFinal: false,
          confidence: alternative.confidence ?? null,
        });
      }
    }
  };

  recognition.onerror = (event) => {
    // "aborted" and "no-speech" are normal endings, not failures.
    if (event.error === "aborted" || event.error === "no-speech") return;
    errors.emit(toNativeError(MODULE, new Error(event.error)));
  };

  recognition.onend = () => {
    if (stopped) return;
    stopped = true;
    ends.emit(undefined);
  };

  try {
    recognition.start();
  } catch (error) {
    throw toNativeError(MODULE, error);
  }

  return {
    onResult: results.add,
    onEnd: ends.add,
    onError: errors.add,
    async stop() {
      if (!stopped) {
        stopped = true;
        try {
          recognition.stop();
        } catch {
          recognition.abort();
        }
        ends.emit(undefined);
      }
      results.clear();
      ends.clear();
      errors.clear();
      return finalTranscript.trim();
    },
  };
}
