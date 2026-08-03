/**
 * Native speech-to-text adapter.
 *
 * Single responsibility: run `@capgo/capacitor-speech-recognition` and
 * translate its callbacks into the shared `SpeechSession` contract.
 */

import { toNativeError } from "../core/errors";
import { createEmitter, removeHandles, type PluginHandle } from "../core/listener";
import { createLazyPlugin } from "../core/lazy-plugin";
import {
  DEFAULT_LANGUAGE,
  type SpeechOptions,
  type SpeechResult,
  type SpeechSession,
} from "./types";

const MODULE = "SpeechRecognition";

interface SpeechPluginApi {
  available: () => Promise<{ available: boolean }>;
  start: (options: Record<string, unknown>) => Promise<{ matches?: string[] }>;
  stop: () => Promise<void>;
  forceStop?: (options: { timeout: number }) => Promise<void>;
  addListener: (
    event: string,
    callback: (data: unknown) => void,
  ) => Promise<PluginHandle>;
  removeAllListeners?: () => Promise<void>;
}

const speechPlugin = createLazyPlugin(MODULE, async () => {
  const { SpeechRecognition } = await import(
    "@capgo/capacitor-speech-recognition"
  );
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: SpeechRecognition as unknown as SpeechPluginApi };
});

export async function nativeIsAvailable(): Promise<boolean> {
  const plugin = (await speechPlugin.optional())?.plugin ?? null;
  if (!plugin) return false;
  try {
    return (await plugin.available()).available;
  } catch {
    return false;
  }
}

/** Read a transcript out of the plugin's loosely-typed partial payload. */
function readMatches(data: unknown): string[] {
  if (Array.isArray(data)) return data.map(String);
  const record = data as { matches?: unknown; value?: unknown } | null;
  if (Array.isArray(record?.matches)) return record.matches.map(String);
  if (Array.isArray(record?.value)) return record.value.map(String);
  if (typeof record?.value === "string") return [record.value];
  return [];
}

export async function nativeStartListening(
  options: SpeechOptions,
): Promise<SpeechSession> {
  const plugin = (await speechPlugin.required()).plugin;
  const results = createEmitter<SpeechResult>("speech:result");
  const ends = createEmitter<void>("speech:end");
  const errors = createEmitter<unknown>("speech:error");
  const handles: PluginHandle[] = [];

  let finalTranscript = "";
  let stopped = false;

  const wantsPartial = options.partialResults ?? true;

  if (wantsPartial) {
    handles.push(
      await plugin.addListener("partialResults", (data) => {
        const [first] = readMatches(data);
        if (!first) return;
        results.emit({ transcript: first, isFinal: false, confidence: null });
      }),
    );
  }

  handles.push(
    await plugin.addListener("listeningState", (data) => {
      const state = (data as { status?: string } | null)?.status;
      if (state === "stopped" && !stopped) {
        stopped = true;
        ends.emit(undefined);
      }
    }),
  );

  const cleanup = async () => {
    await removeHandles(handles);
    handles.length = 0;
    results.clear();
    ends.clear();
    errors.clear();
  };

  // The plugin resolves `start` with the final matches when it stops.
  plugin
    .start({
      language: options.language ?? DEFAULT_LANGUAGE,
      maxResults: 1,
      partialResults: wantsPartial,
      popup: false,
      addPunctuation: options.addPunctuation ?? true,
      ...(options.continuous ? { continuous: true } : {}),
    })
    .then((outcome) => {
      const [first] = outcome.matches ?? [];
      if (first) {
        finalTranscript = first.trim();
        results.emit({
          transcript: finalTranscript,
          isFinal: true,
          confidence: null,
        });
      }
      if (!stopped) {
        stopped = true;
        ends.emit(undefined);
      }
    })
    .catch((error) => {
      errors.emit(toNativeError(MODULE, error));
      if (!stopped) {
        stopped = true;
        ends.emit(undefined);
      }
    });

  return {
    onResult: results.add,
    onEnd: ends.add,
    onError: errors.add,
    async stop() {
      if (!stopped) {
        stopped = true;
        try {
          if (plugin.forceStop) await plugin.forceStop({ timeout: 800 });
          else await plugin.stop();
        } catch {
          await plugin.stop().catch(() => {
            // The engine may already have stopped on its own.
          });
        }
      }
      await cleanup();
      return finalTranscript;
    },
  };
}
