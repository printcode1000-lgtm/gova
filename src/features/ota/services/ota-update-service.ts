import { publicEnv } from "@/core/config/public-env";
import { capacitorOtaAdapter } from "@/platform/ota/capacitor-ota-adapter";
import {
  asolDbGet,
  asolDbSet,
  ASOL_DB_STORES,
} from "@/modules/data-access/browser/asol-db";
import { capabilities } from "@/native-platform";

import { otaApiService } from "./ota-api-service";
import {
  pendingDeltaFiles,
  planOtaDelta,
  runBounded,
} from "../utils/ota-delta-plan";
import { evaluateOtaCapabilities } from "../utils/ota-capability-gate";
import type {
  DownloadedOtaUpdate,
  OtaDownloadProgress,
  OtaFileEntry,
  OtaIdentity,
  OtaManifest,
  OtaManifestPayload,
  OtaStoredState,
} from "../types/ota.types";

const OTA_STATE_KEY = "asol-ota-state-v1";
export const OTA_STATE_EVENT = "asol:ota-state";
const MAX_CHANGED_BYTES = 50 * 1024 * 1024;
const LOCAL_MANIFEST_FILE = "asol-web-manifest.json";
export const OTA_DOWNLOAD_CONCURRENCY = 6;

type OtaDiff = {
  changed: string[];
  deleted: string[];
  downloadBytes: number;
};

function logInfo(message: string, details?: unknown): void {
  if (details === undefined) console.info(`[AsolOTA] ${message}`);
  else console.info(`[AsolOTA] ${message}`, details);
}

function logWarn(message: string, details?: unknown): void {
  if (details === undefined) console.warn(`[AsolOTA] ${message}`);
  else console.warn(`[AsolOTA] ${message}`, details);
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

function encodeHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  return encodeHex(await crypto.subtle.digest("SHA-256", bytes));
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string) =>
    value
      .split("-")[0]!
      .split(".")
      .map((part) => Number(part) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function sortedFiles(
  files: Record<string, OtaFileEntry>,
): Record<string, OtaFileEntry> {
  return Object.fromEntries(
    Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function canonicalPayload(payload: OtaManifestPayload): string {
  return JSON.stringify({
    schemaVersion: payload.schemaVersion,
    delivery: payload.delivery,
    releaseId: payload.releaseId,
    version: payload.version,
    createdAt: payload.createdAt,
    baseUrl: payload.baseUrl,
    size: payload.size,
    fileCount: payload.fileCount,
    minimumNativeVersion: payload.minimumNativeVersion,
    requiredCapabilities: [...(payload.requiredCapabilities ?? [])].sort(),
    mandatory: payload.mandatory,
    notes: payload.notes,
    files: sortedFiles(payload.files),
  });
}

function manifestPayload(manifest: OtaManifest): OtaManifestPayload {
  return {
    schemaVersion: manifest.schemaVersion,
    delivery: manifest.delivery,
    releaseId: manifest.releaseId,
    version: manifest.version,
    createdAt: manifest.createdAt,
    baseUrl: manifest.baseUrl,
    size: manifest.size,
    fileCount: manifest.fileCount,
    minimumNativeVersion: manifest.minimumNativeVersion,
    requiredCapabilities: manifest.requiredCapabilities ?? [],
    mandatory: manifest.mandatory,
    notes: manifest.notes,
    files: manifest.files,
  };
}

function safeFilePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("../") ||
    normalized === ".." ||
    normalized.includes("\0")
  ) {
    throw new Error(`Unsafe OTA manifest file path: ${value}`);
  }
  return normalized;
}

function validateManifest(
  manifest: OtaManifest,
  options: { remote: boolean },
): void {
  if (manifest.schemaVersion !== 2)
    throw new Error(
      `Unsupported OTA manifest schema: ${manifest.schemaVersion}`,
    );
  if (manifest.delivery !== "files")
    throw new Error(`Unsupported OTA delivery: ${manifest.delivery}`);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error(`Invalid OTA version: ${manifest.version}`);
  }
  if (
    !manifest.releaseId ||
    (options.remote && !manifest.baseUrl.startsWith("https://"))
  ) {
    throw new Error("Invalid OTA release metadata");
  }
  if (!Number.isSafeInteger(manifest.size) || manifest.size <= 0) {
    throw new Error("OTA manifest total size is invalid");
  }
  if (!Number.isSafeInteger(manifest.fileCount) || manifest.fileCount <= 0) {
    throw new Error("OTA manifest file count is invalid");
  }
  if (options.remote && !manifest.signature)
    throw new Error("OTA manifest signature is missing");
  if (
    manifest.requiredCapabilities !== undefined &&
    (!Array.isArray(manifest.requiredCapabilities) ||
      manifest.requiredCapabilities.some(
        (key) => typeof key !== "string" || !key,
      ))
  )
    throw new Error("OTA manifest capabilities are invalid");

  const entries = Object.entries(manifest.files);
  if (entries.length !== manifest.fileCount) {
    throw new Error(
      `OTA manifest file count mismatch: ${entries.length} != ${manifest.fileCount}`,
    );
  }

  const totalSize = entries.reduce((total, [filePath, file]) => {
    safeFilePath(filePath);
    if (!/^[a-f0-9]{64}$/i.test(file.sha256)) {
      throw new Error(`Invalid OTA file hash: ${filePath}`);
    }
    if (!Number.isSafeInteger(file.size) || file.size < 0) {
      throw new Error(`Invalid OTA file size: ${filePath}`);
    }
    return total + file.size;
  }, 0);

  if (totalSize !== manifest.size) {
    throw new Error(
      `OTA manifest total size mismatch: ${totalSize} != ${manifest.size}`,
    );
  }
}

async function verifyManifest(manifest: OtaManifest): Promise<boolean> {
  if (!publicEnv.otaPublicKey) return false;
  const publicKey = await crypto.subtle.importKey(
    "spki",
    decodeBase64(publicEnv.otaPublicKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    decodeBase64(manifest.signature ?? ""),
    new TextEncoder().encode(canonicalPayload(manifestPayload(manifest))),
  );
}

async function readState(): Promise<OtaStoredState> {
  try {
    return (
      (await asolDbGet<OtaStoredState>(
        ASOL_DB_STORES.APP_SETTINGS,
        OTA_STATE_KEY,
      )) ?? {}
    );
  } catch {
    return {};
  }
}

async function writeState(state: OtaStoredState): Promise<void> {
  await asolDbSet<OtaStoredState>(
    ASOL_DB_STORES.APP_SETTINGS,
    OTA_STATE_KEY,
    state,
  );
  window.dispatchEvent(new CustomEvent(OTA_STATE_EVENT, { detail: state }));
}

function remoteFileUrl(manifest: OtaManifest, filePath: string): string {
  const baseUrl = manifest.baseUrl.replace(/\/$/, "");
  const encodedPath = safeFilePath(filePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${baseUrl}/${encodedPath}`;
}

function progressDetail(diff: OtaDiff): string {
  return `${diff.changed.length} changed, ${diff.deleted.length} deleted, ${Math.ceil(diff.downloadBytes / 1024)} KB`;
}

let activeDownload: Promise<DownloadedOtaUpdate | null> | null = null;

export const otaUpdateService = {
  isEnabled(): boolean {
    const enabled = Boolean(
      publicEnv.otaManifestUrl &&
      publicEnv.otaPublicKey &&
      capacitorOtaAdapter.isAvailable(),
    );
    if (!enabled) {
      logInfo("OTA disabled", {
        hasManifestUrl: Boolean(publicEnv.otaManifestUrl),
        hasPublicKey: Boolean(publicEnv.otaPublicKey),
        nativePlatform: capacitorOtaAdapter.isAvailable(),
      });
    }
    return enabled;
  },

  getState: readState,

  async getPending(): Promise<DownloadedOtaUpdate | null> {
    return (await readState()).pending ?? null;
  },

  async dismissPending(): Promise<DownloadedOtaUpdate | null> {
    const state = await readState();
    if (!state.pending) return null;
    state.pending.dismissedAt = Date.now();
    await writeState(state);
    logInfo(`Pending update dismissed: ${state.pending.version}`);
    return state.pending;
  },

  async confirmRunningBundle(): Promise<void> {
    const state = await readState();
    if (state.activation?.version !== publicEnv.webBundleVersion) return;
    await capacitorOtaAdapter.persistCurrentPath();
    logInfo(`OTA release persisted: ${state.activation.version}`);
    await capacitorOtaAdapter.cleanupTransaction(state.activation.version);
    delete state.activation;
    delete state.pending;
    await writeState(state);
  },

  async activatePending(identity?: OtaIdentity): Promise<void> {
    const state = await readState();
    if (!state.pending) return;
    const access = await otaApiService.getReleaseAccess({
      releaseId: state.pending.releaseId,
      version: state.pending.version,
      identity,
    });
    if (!access.allowed) {
      throw new Error(
        `OTA release ${state.pending.version} is awaiting super-admin approval`,
      );
    }
    const previousPath = await capacitorOtaAdapter.currentBasePath();
    state.activation = {
      version: state.pending.version,
      releaseId: state.pending.releaseId,
      previousPath,
      startedAt: Date.now(),
    };
    // The working directory is patched only after activation state is durable.
    // Changed/deleted files are backed up by the adapter; splash restores that
    // small backup if the new bundle never confirms its own version.
    await writeState(state);
    try {
      await capacitorOtaAdapter.applyDelta(
        state.pending.version,
        state.pending.changedFiles,
        state.pending.deletedFiles,
      );
    } catch (error) {
      await capacitorOtaAdapter.rollbackDelta(state.pending.version);
      delete state.activation;
      await writeState(state);
      throw error;
    }
    logInfo(`Activating OTA release: ${state.pending.version}`, {
      path: state.pending.path,
    });
    await capacitorOtaAdapter.activate(state.pending.path);
  },

  async checkAndDownload(
    onProgress?: (progress: OtaDownloadProgress) => void,
    identity?: OtaIdentity,
  ): Promise<DownloadedOtaUpdate | null> {
    if (!this.isEnabled()) return null;
    if (activeDownload) return activeDownload;

    activeDownload = (async () => {
      const downloadController = new AbortController();
      const bootstrapController = new AbortController();
      const downloadTimeout = window.setTimeout(() => {
        logWarn(
          "OTA download timeout reached (120s), aborting download operations",
        );
        downloadController.abort();
      }, 120_000);
      const bootstrapTimeout = window.setTimeout(() => {
        logWarn("OTA one-time baseline timeout reached (300s)");
        bootstrapController.abort();
      }, 300_000);

      let downloadAbortedAt: number | null = null;

      downloadController.signal.addEventListener("abort", () => {
        downloadAbortedAt = Date.now();
        logInfo("OTA download controller aborted");
      });

      function getAbortReason(error: unknown): string {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (downloadAbortedAt !== null) return "download timeout (120s)";
          return "manual abort";
        }
        return "network error";
      }

      logInfo("OTA check/download started", {
        downloadTimeout: "120s",
      });

      let remoteEntries: Array<[string, OtaFileEntry]> = [];
      let processed = 0;

      try {
        onProgress?.({
          progress: 8,
          statusKey: "ota.checking",
          detail: "Reading local manifest",
        });
        logInfo("OTA: Reading local manifest (download phase)");
        const localManifest = await otaApiService.getLocalManifest(
          downloadController.signal,
        );
        validateManifest(localManifest, { remote: false });
        logInfo(`Local OTA version: ${localManifest.version}`, {
          fileCount: localManifest.fileCount,
          size: localManifest.size,
        });

        onProgress?.({
          progress: 12,
          statusKey: "ota.checking",
          detail: `Current ${localManifest.version}`,
          currentVersion: localManifest.version,
        });
        logInfo("OTA: Fetching remote manifest from R2 (download phase)");
        const remoteManifest = await otaApiService.getManifest(
          publicEnv.otaManifestUrl,
          downloadController.signal,
        );
        validateManifest(remoteManifest, { remote: true });
        logInfo(`Remote OTA version: ${remoteManifest.version}`, {
          fileCount: remoteManifest.fileCount,
          size: remoteManifest.size,
          releaseId: remoteManifest.releaseId,
        });

        onProgress?.({
          progress: 18,
          statusKey: "ota.verifying",
          detail: `Remote ${remoteManifest.version}`,
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
        });
        if (!(await verifyManifest(remoteManifest))) {
          throw new Error("OTA manifest signature is invalid");
        }

        if ((await readState()).failedReleaseId === remoteManifest.releaseId) {
          logWarn(
            `Skipping previously failed release: ${remoteManifest.releaseId}`,
          );
          return null;
        }
        if (
          compareVersions(remoteManifest.version, localManifest.version) <= 0
        ) {
          logInfo("No OTA update: remote version is not newer", {
            localVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
          });
          onProgress?.({
            progress: 22,
            statusKey: "ota.noUpdate",
            detail: `${localManifest.version} = ${remoteManifest.version}`,
            currentVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
          });
          return null;
        }

        // A web bundle may rely on a native capability (a Capacitor plugin, a
        // permission, an intent filter) that an older shell does not contain.
        // Applying it would leave the application silently degraded, so the
        // release is refused until the user installs a newer store build.
        const installedNativeVersion =
          await capacitorOtaAdapter.nativeVersion();
        if (
          compareVersions(
            remoteManifest.minimumNativeVersion,
            installedNativeVersion,
          ) > 0
        ) {
          logWarn(
            "Skipping OTA update: the installed native shell is too old",
            {
              installedNativeVersion,
              requiredNativeVersion: remoteManifest.minimumNativeVersion,
              remoteVersion: remoteManifest.version,
            },
          );
          onProgress?.({
            progress: 22,
            statusKey: "ota.nativeUpdateRequired",
            detail: `${installedNativeVersion} < ${remoteManifest.minimumNativeVersion}`,
            currentVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
          });
          return null;
        }

        const capabilityDecision = await evaluateOtaCapabilities(
          remoteManifest.requiredCapabilities,
          capabilities,
        );
        if (!capabilityDecision.compatible) {
          logWarn(
            "Skipping OTA update: native shell capabilities are missing",
            {
              missingCapabilities: capabilityDecision.missingCapabilities,
              remoteVersion: remoteManifest.version,
            },
          );
          onProgress?.({
            progress: 22,
            statusKey: "ota.nativeUpdateRequired",
            detail: capabilityDecision.missingCapabilities.join(", "),
            currentVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
          });
          return null;
        }

        const access = await otaApiService.getReleaseAccess(
          {
            releaseId: remoteManifest.releaseId,
            version: remoteManifest.version,
            identity,
          },
          downloadController.signal,
        );
        if (!access.allowed) {
          logInfo(`OTA release awaiting approval: ${remoteManifest.version}`, {
            releaseId: remoteManifest.releaseId,
          });
          onProgress?.({
            progress: 22,
            statusKey: "ota.awaitingApproval",
            detail: `Release ${remoteManifest.version} is not approved`,
            currentVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
          });
          return null;
        }

        const existing = await this.getPending();
        if (
          existing &&
          compareVersions(existing.version, remoteManifest.version) >= 0
        ) {
          logInfo(
            `Using already downloaded pending release: ${existing.version}`,
          );
          return existing;
        }

        const diff = planOtaDelta(localManifest, remoteManifest);
        if (diff.downloadBytes > MAX_CHANGED_BYTES) {
          throw new Error(
            `OTA changed files exceed limit: ${diff.downloadBytes} bytes`,
          );
        }
        logInfo("OTA diff calculated", {
          changedFiles: diff.changed.length,
          deletedFiles: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });
        onProgress?.({
          progress: 25,
          statusKey: "ota.diffReady",
          detail: progressDetail(diff),
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });

        let state = await readState();
        const canResume = state.resume?.releaseId === remoteManifest.releaseId;
        if (canResume)
          await capacitorOtaAdapter.ensureRelease(remoteManifest.version);
        else {
          await capacitorOtaAdapter.prepareRelease(remoteManifest.version);
          state.resume = {
            releaseId: remoteManifest.releaseId,
            version: remoteManifest.version,
            completed: {},
          };
          await writeState(state);
        }
        const resume = (await readState()).resume!;

        // Completion markers are hints only. Every resumed file is read from
        // staging and hashed again before it is trusted.
        for (const filePath of diff.changed) {
          if (
            resume.completed[filePath] !==
            remoteManifest.files[filePath]?.sha256
          )
            continue;
          try {
            const bytes = await capacitorOtaAdapter.readReleaseFile(
              remoteManifest.version,
              filePath,
            );
            if (
              (await sha256(bytes)) !== remoteManifest.files[filePath]!.sha256
            )
              delete resume.completed[filePath];
          } catch {
            delete resume.completed[filePath];
          }
        }
        const remaining = pendingDeltaFiles(diff, remoteManifest, resume);
        remoteEntries = remaining.map(
          (path) =>
            [path, remoteManifest.files[path]!] as [string, OtaFileEntry],
        );
        processed = diff.changed.length - remaining.length;
        let persistResume = Promise.resolve();
        logInfo("OTA: Downloading delta files", {
          remaining: remaining.length,
          concurrency: OTA_DOWNLOAD_CONCURRENCY,
        });

        await runBounded(
          remaining,
          OTA_DOWNLOAD_CONCURRENCY,
          async (filePath) => {
            const expected = remoteManifest.files[filePath]!;
            const bytes = await otaApiService.getFile(
              remoteFileUrl(remoteManifest, filePath),
              downloadController.signal,
            );
            if ((await sha256(bytes)) !== expected.sha256)
              throw new Error(`OTA remote file checksum mismatch: ${filePath}`);
            await capacitorOtaAdapter.writeReleaseFile(
              remoteManifest.version,
              filePath,
              bytes,
            );
            resume.completed[filePath] = expected.sha256;
            processed += 1;
            persistResume = persistResume.then(async () => {
              const latest = await readState();
              latest.resume = { ...resume, completed: { ...resume.completed } };
              await writeState(latest);
            });
            await persistResume;
            onProgress?.({
              progress:
                30 +
                Math.round((processed / Math.max(diff.changed.length, 1)) * 35),
              statusKey: "ota.downloading",
              detail: `${processed}/${diff.changed.length} ${filePath}`,
              currentVersion: localManifest.version,
              remoteVersion: remoteManifest.version,
              changedFileCount: diff.changed.length,
              deletedFileCount: diff.deleted.length,
              downloadBytes: diff.downloadBytes,
            });
          },
        );

        onProgress?.({
          progress: 68,
          statusKey: "ota.installing",
          detail: `Writing ${LOCAL_MANIFEST_FILE}`,
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });
        logInfo("OTA: Writing local manifest to staged release");
        await capacitorOtaAdapter.writeReleaseTextFile(
          remoteManifest.version,
          LOCAL_MANIFEST_FILE,
          JSON.stringify(remoteManifest, null, 2),
        );

        const currentPath = await capacitorOtaAdapter.currentBasePath();
        let stateAfterDownload = await readState();
        if (
          !(await capacitorOtaAdapter.isWorkingPath(currentPath)) &&
          stateAfterDownload.workingBaselineVersion !== localManifest.version
        ) {
          // A store-installed bundle is read-only. The 0.2.0 shell performs
          // this one-time baseline provisioning; every later OTA leaves all
          // unchanged files untouched.
          const baselineFiles = Object.entries(localManifest.files);
          await runBounded(
            baselineFiles,
            OTA_DOWNLOAD_CONCURRENCY,
            async ([filePath, expected]) => {
              const bytes = await otaApiService.getCurrentFile(
                filePath,
                bootstrapController.signal,
              );
              if ((await sha256(bytes)) !== expected.sha256)
                throw new Error(`OTA baseline checksum mismatch: ${filePath}`);
              await capacitorOtaAdapter.writeWorkingFile(filePath, bytes);
            },
          );
          await capacitorOtaAdapter.writeWorkingFile(
            LOCAL_MANIFEST_FILE,
            new TextEncoder().encode(JSON.stringify(localManifest, null, 2))
              .buffer,
          );
          stateAfterDownload = await readState();
          stateAfterDownload.workingBaselineVersion = localManifest.version;
        }
        const path = await capacitorOtaAdapter.workingPath();
        const pending: DownloadedOtaUpdate = {
          version: remoteManifest.version,
          releaseId: remoteManifest.releaseId,
          path,
          size: diff.downloadBytes,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          notes: remoteManifest.notes,
          downloadedAt: Date.now(),
          changedFiles: diff.changed,
          deletedFiles: diff.deleted,
        };
        delete stateAfterDownload.resume;
        stateAfterDownload.pending = pending;
        await writeState(stateAfterDownload);
        logInfo(`OTA release ready: ${remoteManifest.version}`, pending);
        logInfo("OTA check/download completed successfully");
        onProgress?.({
          progress: 70,
          statusKey: "ota.downloaded",
          detail: progressDetail(diff),
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });
        return pending;
      } catch (error) {
        const abortReason = getAbortReason(error);
        logWarn("OTA check/download failed", {
          reason: abortReason,
          message: error instanceof Error ? error.message : error,
          downloadAbortedAt,
          processedFiles: processed,
          totalFiles: remoteEntries.length,
        });
        throw error;
      } finally {
        window.clearTimeout(downloadTimeout);
        window.clearTimeout(bootstrapTimeout);
        activeDownload = null;
        logInfo("OTA: Cleanup - timeouts cleared");
      }
    })();

    return activeDownload;
  },

  async prepareAtSplash(
    onProgress: (progress: OtaDownloadProgress) => void,
    identity?: OtaIdentity,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    const state = await readState();
    if (state.activation) {
      if (state.activation.version === publicEnv.webBundleVersion) {
        logInfo(
          `Activated release reached splash: ${state.activation.version}`,
        );
        return;
      }

      if (state.pending) state.failedReleaseId = state.pending.releaseId;
      logWarn(
        "Activation did not reach expected web bundle version; clearing pending release",
        {
          expected: state.activation.version,
          current: publicEnv.webBundleVersion,
        },
      );
      // The active directory was patched in place. Restore only files touched
      // by this release, then switch back to the path recorded before patching.
      await capacitorOtaAdapter.rollbackDelta(state.activation.version);
      const previousPath = state.activation.previousPath;
      delete state.activation;
      delete state.pending;
      await writeState(state);
      await capacitorOtaAdapter.activate(previousPath);
      return;
    }

    let pending = await this.getPending();
    if (pending) {
      try {
        const access = await otaApiService.getReleaseAccess({
          releaseId: pending.releaseId,
          version: pending.version,
          identity,
        });
        if (!access.allowed) {
          logInfo(
            `Pending OTA release is no longer approved: ${pending.version}`,
          );
          onProgress({
            progress: 20,
            statusKey: "ota.awaitingApproval",
            detail: `Release ${pending.version} is not approved`,
            remoteVersion: pending.version,
          });
          return;
        }
        await this.checkAndDownload(onProgress, identity);
        pending = await this.getPending();
      } catch (error) {
        logWarn(
          "Pending update refresh skipped",
          error instanceof Error ? error.message : error,
        );
        return;
      }
      if (pending) {
        onProgress({
          progress: 5,
          statusKey: "ota.applying",
          detail: `Applying ${pending.version}`,
          remoteVersion: pending.version,
          changedFileCount: pending.changedFileCount,
          deletedFileCount: pending.deletedFileCount,
          downloadBytes: pending.size,
        });
      }
      await this.activatePending(identity);
      return;
    }

    try {
      await this.checkAndDownload(onProgress, identity);
    } catch (error) {
      onProgress({
        progress: 20,
        statusKey: "ota.failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
