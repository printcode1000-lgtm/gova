import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { speechAdapter } from "../adapters/speech.adapter";
import { permissionsAdapter } from "../adapters/permissions.adapter";
import { PermissionKinds } from "../domain/permissions/permission-kinds";
import type { SpeechOptions, SpeechRecognitionResult } from "../domain/speech/types";
import type { PermissionResult } from "../domain/permissions/permission-kinds";

const MODULE = "Speech";

export const speechApi = {
  async startSpeechRecognition(options?: SpeechOptions): Promise<Result<SpeechRecognitionResult, NativeCoreError>> {
    try {
      const res = await speechAdapter.startListening(options);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async stopSpeechRecognition(): Promise<Result<void, NativeCoreError>> {
    try {
      await speechAdapter.stopListening();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async isSpeechRecognitionAvailable(): Promise<Result<boolean, NativeCoreError>> {
    try {
      const avail = await speechAdapter.isAvailable();
      return ok(avail);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async checkSpeechPermissions(): Promise<Result<PermissionResult, NativeCoreError>> {
    try {
      const res = await permissionsAdapter.check(PermissionKinds.SpeechRecognition);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async requestSpeechPermissions(): Promise<Result<PermissionResult, NativeCoreError>> {
    try {
      const res = await permissionsAdapter.request(PermissionKinds.SpeechRecognition);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
