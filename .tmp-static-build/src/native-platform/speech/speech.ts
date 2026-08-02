/**
 * Public Speech Recognition API — voice-to-text only.
 *
 * Single responsibility: select the platform adapter, enforce the microphone
 * permission, and keep at most one listening session alive at a time.
 *
 * This module never records audio, never writes an audio file, and never
 * uploads audio. Only recognized text leaves it.
 */

import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import { permissionManager } from "../permissions/permission-manager";
import { PermissionKinds } from "../permissions/types";
import { nativeIsAvailable, nativeStartListening } from "./speech-native-adapter";
import { webIsAvailable, webStartListening } from "./speech-web-adapter";
import type {
  PermissionResultLike,
  SpeechOptions,
  SpeechSession,
} from "./module-types";

const MODULE = "SpeechRecognition";

export class SpeechRecognitionModule {
  private activeSession: SpeechSession | null = null;

  /** True when an engine exists on this platform. */
  isAvailable(): Promise<boolean> {
    return isNativePlatform() ? nativeIsAvailable() : webIsAvailable();
  }

  /** Current microphone/speech permission without prompting. */
  checkPermission(): Promise<PermissionResultLike> {
    return permissionManager.check(PermissionKinds.SpeechRecognition);
  }

  /** Prompt for microphone/speech access. */
  requestPermission(): Promise<PermissionResultLike> {
    return permissionManager.request(PermissionKinds.SpeechRecognition);
  }

  /**
   * Begin listening. Any previous session is stopped first, so the engine is
   * never asked to run twice concurrently.
   */
  async startListening(options: SpeechOptions = {}): Promise<SpeechSession> {
    if (!(await this.isAvailable())) {
      throw NativePlatformError.unavailable(
        MODULE,
        "Speech recognition is not available on this device.",
      );
    }

    const permission = await permissionManager.requestIfNeeded(
      PermissionKinds.SpeechRecognition,
    );
    if (permission.state !== "unsupported" && !permission.granted) {
      throw NativePlatformError.permissionDenied(
        MODULE,
        permission.requiresSettings
          ? "Microphone access is blocked. Enable it from the application settings."
          : "Microphone access was not granted.",
      );
    }

    await this.stopListening();

    const session = isNativePlatform()
      ? await nativeStartListening(options)
      : await webStartListening(options);

    this.activeSession = session;
    session.onEnd(() => {
      if (this.activeSession === session) this.activeSession = null;
    });
    return session;
  }

  /**
   * Stop the current session.
   * @returns The final transcript, or an empty string when nothing was active.
   */
  async stopListening(): Promise<string> {
    const session = this.activeSession;
    if (!session) return "";
    this.activeSession = null;
    return session.stop();
  }

  /** True while a session is listening. */
  isListening(): boolean {
    return this.activeSession !== null;
  }

  /**
   * Convenience wrapper for the common "listen once, give me the text" flow.
   * Resolves when the engine finishes on its own.
   */
  async transcribeOnce(options: SpeechOptions = {}): Promise<string> {
    const session = await this.startListening({
      ...options,
      continuous: false,
    });

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = async () => {
        if (settled) return;
        settled = true;
        resolve(await session.stop());
      };
      session.onEnd(() => void finish());
      session.onError((error) => {
        if (settled) return;
        settled = true;
        void session.stop();
        reject(error);
      });
    });
  }
}

export const speechRecognition = new SpeechRecognitionModule();
