import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { otaAdapter } from "../adapters/ota.adapter";

const MODULE = "OTA";

export const otaApi = {
  isOtaAvailable(): boolean {
    return otaAdapter.isAvailable();
  },

  async otaNativeVersion(): Promise<Result<string, NativeCoreError>> {
    try {
      const ver = await otaAdapter.nativeVersion();
      return ok(ver);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaCurrentBasePath(): Promise<Result<string, NativeCoreError>> {
    try {
      const path = await otaAdapter.currentBasePath();
      return ok(path);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaIsWorkingPath(path: string): Promise<Result<boolean, NativeCoreError>> {
    try {
      const isWorking = await otaAdapter.isWorkingPath(path);
      return ok(isWorking);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaPrepareWorkingBaseline(): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.prepareWorkingBaseline();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaWriteWorkingFile(
    path: string,
    data: ArrayBuffer,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.writeWorkingFile(path, data);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaReadWorkingFile(
    path: string,
  ): Promise<Result<ArrayBuffer, NativeCoreError>> {
    try {
      const data = await otaAdapter.readWorkingFile(path);
      return ok(data);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaPrepareRelease(
    baseVersion: string,
    version: string,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.prepareRelease(baseVersion, version);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaReleaseFileExists(
    version: string,
    filePath: string,
  ): Promise<Result<boolean, NativeCoreError>> {
    try {
      const exists = await otaAdapter.releaseFileExists(version, filePath);
      return ok(exists);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaBeginReleaseFile(
    version: string,
    filePath: string,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.beginReleaseFile(version, filePath);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaAppendReleaseFile(
    version: string,
    filePath: string,
    data: Uint8Array,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.appendReleaseFile(version, filePath, data);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaWriteReleaseFile(
    version: string,
    filePath: string,
    data: ArrayBuffer,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.writeReleaseFile(version, filePath, data);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaWriteReleaseTextFile(
    version: string,
    filePath: string,
    text: string,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.writeReleaseTextFile(version, filePath, text);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaReadReleaseFile(
    version: string,
    filePath: string,
  ): Promise<Result<ArrayBuffer, NativeCoreError>> {
    try {
      const data = await otaAdapter.readReleaseFile(version, filePath);
      return ok(data);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaFinalizeCandidate(
    version: string,
    deleted: readonly string[],
  ): Promise<Result<string, NativeCoreError>> {
    try {
      const path = await otaAdapter.finalizeCandidate(version, deleted);
      return ok(path);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaActivationPath(
    version: string,
  ): Promise<Result<string, NativeCoreError>> {
    try {
      const path = await otaAdapter.activationPath(version);
      return ok(path);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaActivate(path: string): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.activate(path);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaPersistCurrentPath(): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.persistCurrentPath();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaConfirmActivation(
    version: string,
    previousVersion: string,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.confirmActivation(version, previousVersion);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaRollbackDelta(version: string): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.rollbackDelta(version);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaCleanupTransaction(
    version: string,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.cleanupTransaction(version);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async otaRevertToNativeBaseline(): Promise<Result<void, NativeCoreError>> {
    try {
      await otaAdapter.revertToNativeBaseline();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
