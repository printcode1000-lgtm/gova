import {
  NativeCore,
  type BackgroundDownloadTask,
} from "@asol/native-core";

export const capacitorOtaAdapter = {
  isAvailable: () => NativeCore.isOtaAvailable(),
  nativeVersion: async () => {
    const res = await NativeCore.otaNativeVersion();
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  currentBasePath: async () => {
    const res = await NativeCore.otaCurrentBasePath();
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  isWorkingPath: async (path: string) => {
    const res = await NativeCore.otaIsWorkingPath(path);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  prepareWorkingBaseline: async () => {
    const res = await NativeCore.otaPrepareWorkingBaseline();
    if (!res.ok) throw new Error(res.error.message);
  },
  writeWorkingFile: async (path: string, data: ArrayBuffer) => {
    const res = await NativeCore.otaWriteWorkingFile(path, data);
    if (!res.ok) throw new Error(res.error.message);
  },
  readWorkingFile: async (path: string) => {
    const res = await NativeCore.otaReadWorkingFile(path);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  prepareRelease: async (baseVersion: string, version: string) => {
    const res = await NativeCore.otaPrepareRelease(baseVersion, version);
    if (!res.ok) throw new Error(res.error.message);
  },
  releaseExists: async (version: string) => {
    const res = await NativeCore.otaReleaseFileExists(version, "");
    return res.ok ? res.value : false;
  },
  releaseFileExists: async (version: string, path: string) => {
    const res = await NativeCore.otaReleaseFileExists(version, path);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  beginReleaseFile: async (version: string, path: string) => {
    const res = await NativeCore.otaBeginReleaseFile(version, path);
    if (!res.ok) throw new Error(res.error.message);
  },
  appendReleaseFile: async (version: string, path: string, data: Uint8Array) => {
    const res = await NativeCore.otaAppendReleaseFile(version, path, data);
    if (!res.ok) throw new Error(res.error.message);
  },
  writeReleaseFile: async (version: string, path: string, data: ArrayBuffer) => {
    const res = await NativeCore.otaWriteReleaseFile(version, path, data);
    if (!res.ok) throw new Error(res.error.message);
  },
  writeReleaseTextFile: async (version: string, path: string, text: string) => {
    const res = await NativeCore.otaWriteReleaseTextFile(version, path, text);
    if (!res.ok) throw new Error(res.error.message);
  },
  readReleaseFile: async (version: string, path: string) => {
    const res = await NativeCore.otaReadReleaseFile(version, path);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  finalizeCandidate: async (version: string, deleted: readonly string[]) => {
    const res = await NativeCore.otaFinalizeCandidate(version, deleted);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  activationPath: async (version: string) => {
    const res = await NativeCore.otaActivationPath(version);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  activate: async (path: string) => {
    const res = await NativeCore.otaActivate(path);
    if (!res.ok) throw new Error(res.error.message);
  },
  persistCurrentPath: async () => {
    const res = await NativeCore.otaPersistCurrentPath();
    if (!res.ok) throw new Error(res.error.message);
  },
  confirmActivation: async (version: string, prev: string) => {
    const res = await NativeCore.otaConfirmActivation(version, prev);
    if (!res.ok) throw new Error(res.error.message);
  },
  rollbackDelta: async (version: string) => {
    const res = await NativeCore.otaRollbackDelta(version);
    if (!res.ok) throw new Error(res.error.message);
  },
  cleanupTransaction: async (version: string) => {
    const res = await NativeCore.otaCleanupTransaction(version);
    if (!res.ok) throw new Error(res.error.message);
  },
  revertToNativeBaseline: async () => {
    const res = await NativeCore.otaRevertToNativeBaseline();
    if (!res.ok) throw new Error(res.error.message);
  },
};

function backgroundDownloadId(options: any): string {
  return typeof options === "string"
    ? options
    : options?.releaseId;
}

export const nativePlatform = {
  isNative: () => NativeCore.isNative(),
  storageCapacity: {
    getFreeSpace: async () => {
      const res = await NativeCore.getStorageFreeSpace();
      if (!res.ok) throw new Error(res.error.message);
      return res.value;
    },
    getFreeDiskSpace: async () => {
      const res = await NativeCore.getStorageFreeSpace();
      if (!res.ok) throw new Error(res.error.message);
      return res.value;
    },
  },
  backgroundDownload: {
    isAvailable: () => NativeCore.isNative(),
    schedule: async (options: any) => {
      const res = await NativeCore.startBackgroundDownload(options);
      if (!res.ok) throw new Error(res.error.message);
      return res.value;
    },
    status: async (options: any): Promise<BackgroundDownloadTask> => {
      const id = backgroundDownloadId(options);
      const res = await NativeCore.getBackgroundDownloadStatus(id);
      if (!res.ok) throw new Error(res.error.message);
      return res.value ?? {
        id: id ?? "",
        url: "",
        destinationPath: "",
        bytesDownloaded: 0,
        totalBytes: 0,
        state: "missing" as const,
        status: "missing" as const,
      };
    },
    remove: async (options: any) => {
      const id = backgroundDownloadId(options);
      const res = await NativeCore.cancelBackgroundDownload(id);
      if (!res.ok) throw new Error(res.error.message);
      return res.value;
    },
    start: async (options: any) => {
      const res = await NativeCore.startBackgroundDownload(options);
      if (!res.ok) throw new Error(res.error.message);
      return res.value;
    },
    getStatus: async (options: any): Promise<BackgroundDownloadTask> => {
      const id = backgroundDownloadId(options);
      const res = await NativeCore.getBackgroundDownloadStatus(id);
      if (!res.ok) throw new Error(res.error.message);
      return res.value ?? {
        id: id ?? "",
        url: "",
        destinationPath: "",
        bytesDownloaded: 0,
        totalBytes: 0,
        state: "missing" as const,
        status: "missing" as const,
      };
    },
    cancel: async (options: any) => {
      const id = backgroundDownloadId(options);
      const res = await NativeCore.cancelBackgroundDownload(id);
      if (!res.ok) throw new Error(res.error.message);
      return res.value;
    },
    read: async (
      task: { destinationPath?: string; version?: string },
      onChunk: (chunk: Uint8Array) => Promise<void> | void,
    ) => {
      if (task.destinationPath) {
        const res = await NativeCore.otaReadReleaseFile(
          task.version ?? "current",
          task.destinationPath,
        );
        if (res.ok) {
          await onChunk(new Uint8Array(res.value));
        }
      }
    },
  },
  preferences: {
    get: async (key: string) => {
      const res = await NativeCore.getPreference(key);
      if (!res.ok) return null;
      return res.value.value;
    },
    set: async (key: string, value: string) => {
      await NativeCore.setPreference(key, value);
    },
    remove: async (key: string) => {
      await NativeCore.removePreference(key);
    },
  },
  app: {
    getAppInfo: async () => {
      const res = await NativeCore.getAppInfo();
      if (!res.ok) throw new Error(res.error.message);
      return res.value;
    },
    restart: async () => {
      if (typeof window !== "undefined") window.location.reload();
    },
  },
};
