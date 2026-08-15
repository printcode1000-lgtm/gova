import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError, NativeCoreError } from "../errors/native-core-error";
import { isNativePlatform, hasDom } from "./platform.adapter";
import type { SpeechOptions, SpeechRecognitionResult, SpeechRecognitionLanguage } from "../domain/speech/types";

const MODULE = "SpeechRecognition";

const speechPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(SpeechRecognition);
});

export const speechAdapter = {
  async isAvailable(): Promise<boolean> {
    if (isNativePlatform()) {
      const plugin = await speechPlugin.optional();
      if (!plugin) return false;
      const res = await plugin.available().catch(() => ({ available: false }));
      return res.available;
    }
    return hasDom() && typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  },

  async startListening(options: SpeechOptions = {}): Promise<SpeechRecognitionResult> {
    try {
      if (isNativePlatform()) {
        const plugin = await speechPlugin.required();
        const res = await plugin.start({
          language: options.language ?? "ar-SA",
          maxResults: options.maxResults ?? 5,
          prompt: options.prompt,
          partialResults: options.partialResults ?? false,
          popup: options.popup ?? false,
        });
        return { matches: res.matches ?? [] };
      }

      if (!hasDom()) throw NativeCoreError.unavailable(MODULE);

      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) throw NativeCoreError.unavailable(MODULE);

      return new Promise<SpeechRecognitionResult>((resolve, reject) => {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = options.language ?? "ar-SA";
        recognition.interimResults = false;
        recognition.maxAlternatives = options.maxResults ?? 1;

        recognition.onresult = (event: any) => {
          const matches: string[] = [];
          for (let i = 0; i < event.results.length; i++) {
            matches.push(event.results[i][0].transcript);
          }
          resolve({ matches });
        };

        recognition.onerror = (event: any) => {
          reject(toNativeCoreError(MODULE, new Error(event.error)));
        };

        recognition.start();
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async stopListening(): Promise<void> {
    try {
      if (isNativePlatform()) {
        const plugin = await speechPlugin.required();
        await plugin.stop();
      }
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};

export interface SpeechRecognitionAdapter {
  isAvailable: () => Promise<boolean>;
  start: (options?: SpeechOptions | SpeechRecognitionLanguage) => Promise<string>;
  stop: () => Promise<void>;
}

export function createSpeechRecognitionAdapter(): SpeechRecognitionAdapter {
  return {
    isAvailable: () => speechAdapter.isAvailable(),
    start: async (options) => {
      const opts: SpeechOptions =
        typeof options === "string" ? { language: options } : options ?? {};
      const res = await speechAdapter.startListening(opts);
      return res.matches[0] ?? "";
    },
    stop: () => speechAdapter.stopListening(),
  };
}
