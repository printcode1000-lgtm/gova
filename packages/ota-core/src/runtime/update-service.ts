import { otaPublicEnv } from '../ports';
import { otaIdentity } from "../ports";
import {
  capabilities,
  type BackgroundDownloadTask,
} from "@asol/native-core";
import { capacitorOtaAdapter, nativePlatform } from "./native-adapters";

import {
  asolDbGet,
  asolDbSet,
  ASOL_DB_STORES,
} from "@asol/data-core/browser";

import { otaApiService } from "./api-service";
import { otaRevocationService } from "./revocation-service";
import { otaFailureReason, recordOtaOutcome } from "./outcome-logger";
import { canonicalOtaManifestPayload } from "../domain/release/signature-payload";
import type { OtaRevocationDocument } from "../domain/release/revocation-document";
import { compareOtaCanonicalStrings } from "../domain/release/canonical-order";
import { OtaStaleRemoteFileError } from "../domain/release/stale-file-error";
import { evaluateOtaCapabilities } from "../domain/release/capability-gate";
import {
  bundleUrl,
  extractOtaBundle,
  selectOtaBundle,
  selectOtaBundleAttempt,
} from "../domain/release/bundle";
import {
  pendingDeltaFiles,
  planOtaDelta,
  runBounded,
} from "../domain/release/delta-plan";
import {
  clampFutureOtaCheckTimestamp,
  compareOtaVersions,
  isDailyOtaCheckDue,
  isOtaVersion,
  isReadyForOtaActivation,
  migrateOtaState,
  nativeDownloadPollAction,
  reconcileNativeDownloadTask,
  requiredOtaFreeBytes,
  shouldPersistNativeDownloadProgress,
  shouldSupersedePending,
} from "../domain/release/ota-state";
import type {
  DownloadedOtaUpdate,
  OtaDownloadProgress,
  OtaFileEntry,
  OtaIdentity,
  OtaManifest,
  OtaManifestPayload,
  OtaReleaseAccess,
  OtaStoredState,
} from "../domain/release/manifest-types";

const OTA_STATE_KEY = "asol-ota-state-v1";
export const OTA_STATE_EVENT = "asol:ota-state";
export const OTA_DOWNLOAD_CONCURRENCY = 6;
export const OTA_BASELINE_CONCURRENCY = 24;
const OTA_BASELINE_CHECKPOINT_FILES = 32;
const LOCAL_MANIFEST_FILE = "asol-web-manifest.json";
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const APPROVAL_TIMEOUT_MS = 2_000;
const REVOCATION_TIMEOUT_MS = 3_000;
const NATIVE_DOWNLOAD_POLL_MS = 1_000;
const NATIVE_DOWNLOAD_TIMEOUT_MS = 60 * 60 * 1_000;

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
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

function encodeHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  return encodeHex(await crypto.subtle.digest("SHA-256", bytes));
}

export const canonicalOtaClientPayload = canonicalOtaManifestPayload;

function manifestPayload(manifest: OtaManifest): OtaManifestPayload {
  const { signature: _signature, ...payload } = manifest;
  return payload;
}

function safeFilePath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized === ".." ||
    normalized.split("/").includes("..") ||
    normalized.includes("\0")
  ) {
    throw new Error(`Unsafe OTA manifest file path: ${value}`);
  }
  return normalized;
}

function validateManifest(manifest: OtaManifest, remote: boolean): void {
  if (manifest.schemaVersion !== 2 || manifest.delivery !== "files")
    throw new Error("Unsupported OTA manifest contract");
  if (!isOtaVersion(manifest.version))
    throw new Error(`Invalid OTA version: ${manifest.version}`);
  if (!manifest.releaseId || (remote && !manifest.baseUrl.startsWith("https://")))
    throw new Error("Invalid OTA release metadata");
  if (!Number.isSafeInteger(manifest.size) || manifest.size <= 0)
    throw new Error("OTA manifest total size is invalid");
  if (!Number.isSafeInteger(manifest.fileCount) || manifest.fileCount <= 0)
    throw new Error("OTA manifest file count is invalid");
  if (remote && !manifest.signature) throw new Error("OTA manifest signature is missing");
  if (
    !Array.isArray(manifest.requiredCapabilities) ||
    manifest.requiredCapabilities.some((key) => typeof key !== "string" || !key)
  ) throw new Error("OTA manifest capabilities are invalid");
  if (
    manifest.optionalCapabilities !== undefined &&
    (!Array.isArray(manifest.optionalCapabilities) ||
      manifest.optionalCapabilities.some((key) => typeof key !== "string" || !key))
  ) throw new Error("OTA manifest capabilities are invalid");

  const entries = Object.entries(manifest.files);
  if (entries.length !== manifest.fileCount) throw new Error("OTA manifest file count mismatch");
  const total = entries.reduce((sum, [filePath, file]) => {
    safeFilePath(filePath);
    if (!/^[a-f0-9]{64}$/i.test(file.sha256)) throw new Error(`Invalid OTA file hash: ${filePath}`);
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error(`Invalid OTA file size: ${filePath}`);
    return sum + file.size;
  }, 0);
  if (total !== manifest.size) throw new Error("OTA manifest total size mismatch");

  const deltas = manifest.bundles?.deltas ?? [];
  if (
    manifest.bundles &&
    (!Array.isArray(manifest.bundles.deltas) ||
      deltas.some((delta, index) =>
        !delta.fromVersion ||
        (index > 0 && compareOtaCanonicalStrings(deltas[index - 1]!.fromVersion, delta.fromVersion) >= 0)))
  ) throw new Error("OTA bundle deltas are invalid");
  for (const bundle of [manifest.bundles?.full, ...deltas]) {
    if (!bundle) continue;
    safeFilePath(bundle.path);
    if (!/^[a-f0-9]{64}$/i.test(bundle.sha256) || !Number.isSafeInteger(bundle.size) || bundle.size <= 0)
      throw new Error("OTA bundle metadata is invalid");
  }
}

async function verifyManifest(manifest: OtaManifest): Promise<boolean> {
  if (!otaPublicEnv().otaPublicKey) return false;
  const key = await crypto.subtle.importKey(
    "spki",
    decodeBase64(otaPublicEnv().otaPublicKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    decodeBase64(manifest.signature ?? ""),
    new TextEncoder().encode(canonicalOtaClientPayload(manifestPayload(manifest))),
  );
}

export async function readOtaState(): Promise<OtaStoredState> {
  try {
    return migrateOtaState(
      await asolDbGet<unknown>(ASOL_DB_STORES.APP_SETTINGS, OTA_STATE_KEY),
    );
  } catch {
    return {};
  }
}

async function writeState(state: OtaStoredState): Promise<void> {
  await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, OTA_STATE_KEY, state);
  window.dispatchEvent(new CustomEvent(OTA_STATE_EVENT, { detail: state }));
}

async function updateStatus(
  state: OtaStoredState,
  progress: OtaDownloadProgress,
  notify?: (progress: OtaDownloadProgress) => void,
  persist = true,
): Promise<void> {
  state.lastStatusKey = progress.statusKey;
  state.nativeUpdateRequired = progress.nativeUpdateRequired;
  state.requiredFreeBytes = progress.requiredFreeBytes;
  if (state.download) {
    state.download.downloadedBytes = progress.downloadedBytes ?? state.download.downloadedBytes;
    state.download.totalBytes = progress.totalBytes ?? state.download.totalBytes;
  }
  if (persist) await writeState(state);
  notify?.(progress);
}

function remoteFileUrl(manifest: OtaManifest, filePath: string): string {
  return `${manifest.baseUrl.replace(/\/$/, "")}/${safeFilePath(filePath)
    .split("/").map(encodeURIComponent).join("/")}`;
}

async function* nativeTaskChunks(task: BackgroundDownloadTask): AsyncGenerator<Uint8Array> {
  type Item = { chunk: Uint8Array; consumed: () => void };
  const queue: Item[] = [];
  let wake: (() => void) | null = null;
  let done = false;
  let failure: unknown;
  const reading = nativePlatform.backgroundDownload
    .read(task, (chunk) => new Promise<void>((resolve) => {
      queue.push({ chunk, consumed: resolve });
      wake?.();
      wake = null;
    }))
    .catch((error) => { failure = error; })
    .finally(() => { done = true; wake?.(); wake = null; });

  while (!done || queue.length) {
    if (!queue.length) await new Promise<void>((resolve) => { wake = resolve; });
    const item = queue.shift();
    if (!item) continue;
    yield item.chunk;
    item.consumed();
  }
  await reading;
  if (failure) throw failure;
}

async function provisionWorkingBaseline(
  localManifest: OtaManifest,
  state: OtaStoredState,
  notify?: (progress: OtaDownloadProgress) => void,
): Promise<void> {
  const currentPath = await capacitorOtaAdapter.currentBasePath();
  if (
    (await capacitorOtaAdapter.isWorkingPath(currentPath)) ||
    state.workingBaselineVersion === localManifest.version
  ) return;
  if (state.baseline?.version !== localManifest.version) {
    await capacitorOtaAdapter.prepareWorkingBaseline();
    state.baseline = { version: localManifest.version, completed: {} };
    await writeState(state);
  }
  const baseline = state.baseline;
  for (const [path, expected] of Object.entries(localManifest.files)) {
    if (baseline.completed[path] !== expected.sha256) continue;
    try {
      const bytes = await capacitorOtaAdapter.readWorkingFile(path);
      if ((await sha256(bytes)) !== expected.sha256) delete baseline.completed[path];
    } catch {
      delete baseline.completed[path];
    }
  }
  const entries = Object.entries(localManifest.files);
  const remaining = entries.filter(([path, expected]) => baseline.completed[path] !== expected.sha256);
  let completedCount = entries.length - remaining.length;
  let completedBytes = entries.reduce(
    (total, [path, expected]) => total + (baseline.completed[path] === expected.sha256 ? expected.size : 0),
    0,
  );
  let checkpointCount = completedCount;
  const reportBaseline = () => {
    const progress: OtaDownloadProgress = {
      progress: Math.round(completedCount / Math.max(entries.length, 1) * 100),
      statusKey: "ota.provisioningBaseline",
      downloadedBytes: completedBytes,
      totalBytes: localManifest.size,
    };
    state.lastStatusKey = progress.statusKey;
    notify?.(progress);
  };
  reportBaseline();
  await runBounded(remaining, OTA_BASELINE_CONCURRENCY, async ([path, expected]) => {
    const bytes = await otaApiService.getCurrentFile(path);
    if ((await sha256(bytes)) !== expected.sha256) {
      throw new OtaStaleRemoteFileError(path);
    }
    await capacitorOtaAdapter.writeWorkingFile(path, bytes);
    baseline.completed[path] = expected.sha256;
    completedCount += 1;
    completedBytes += expected.size;
    reportBaseline();
    if (completedCount - checkpointCount >= OTA_BASELINE_CHECKPOINT_FILES) {
      checkpointCount = completedCount;
      state.baseline = { ...baseline, completed: { ...baseline.completed } };
      await writeState(state);
    }
  });
  await capacitorOtaAdapter.writeWorkingFile(
    LOCAL_MANIFEST_FILE,
    new TextEncoder().encode(JSON.stringify(localManifest, null, 2)).buffer,
  );
  state.workingBaselineVersion = localManifest.version;
  delete state.baseline;
  await writeState(state);
}

async function finalizePending(
  localManifest: OtaManifest,
  remote: OtaManifest,
  changed: string[],
  deleted: string[],
  totalBytes: number,
  state: OtaStoredState,
  notify?: (progress: OtaDownloadProgress) => void,
): Promise<DownloadedOtaUpdate> {
  await capacitorOtaAdapter.writeReleaseTextFile(remote.version, LOCAL_MANIFEST_FILE, JSON.stringify(remote, null, 2));
  const pending: DownloadedOtaUpdate = {
    baseVersion: localManifest.version,
    version: remote.version,
    releaseId: remote.releaseId,
    path: await capacitorOtaAdapter.finalizeCandidate(remote.version, deleted),
    size: totalBytes,
    totalBytes,
    notes: remote.notes,
    downloadedAt: Date.now(),
    changedFiles: changed,
    deletedFiles: deleted,
    ready: true,
  };
  delete state.resume;
  delete state.download;
  delete state.discovered;
  state.pending = pending;
  state.lastStatusKey = "ota.ready";
  await writeState(state);
  return pending;
}

async function downloadPerFile(
  local: OtaManifest,
  remote: OtaManifest,
  changed: string[],
  deleted: string[],
  totalBytes: number,
  state: OtaStoredState,
  notify?: (progress: OtaDownloadProgress) => void,
): Promise<DownloadedOtaUpdate> {
  await provisionWorkingBaseline(local, state, notify);
  const resumable =
    state.resume?.releaseId === remote.releaseId &&
    (await capacitorOtaAdapter.releaseExists(remote.version));
  if (!resumable) {
    await capacitorOtaAdapter.prepareRelease(local.version, remote.version);
    state.resume = { releaseId: remote.releaseId, version: remote.version, completed: {} };
  }
  const resume = state.resume!;
  for (const path of changed) {
    if (resume.completed[path] !== remote.files[path]?.sha256) continue;
    try {
      const bytes = await capacitorOtaAdapter.readReleaseFile(remote.version, path);
      if ((await sha256(bytes)) !== remote.files[path]!.sha256) delete resume.completed[path];
    } catch { delete resume.completed[path]; }
  }
  const remaining = pendingDeltaFiles({ changed, deleted, downloadBytes: totalBytes }, remote, resume);
  let downloaded = changed.reduce((sum, path) => resume.completed[path] ? sum + remote.files[path]!.size : sum, 0);
  await runBounded(remaining, OTA_DOWNLOAD_CONCURRENCY, async (path) => {
    const expected = remote.files[path]!;
    const bytes = await otaApiService.getFile(remoteFileUrl(remote, path));
    if ((await sha256(bytes)) !== expected.sha256) throw new OtaStaleRemoteFileError(path);
    await capacitorOtaAdapter.writeReleaseFile(remote.version, path, bytes);
    resume.completed[path] = expected.sha256;
    downloaded += expected.size;
    state.resume = { ...resume, completed: { ...resume.completed } };
    await updateStatus(state, { progress: Math.round(downloaded / Math.max(totalBytes, 1) * 100), statusKey: "ota.downloading", downloadedBytes: downloaded, totalBytes }, notify);
  });
  return finalizePending(local, remote, changed, deleted, totalBytes, state, notify);
}

async function downloadNativeBundle(
  local: OtaManifest,
  remote: OtaManifest,
  changed: string[],
  deleted: string[],
  state: OtaStoredState,
  notify?: (progress: OtaDownloadProgress) => void,
): Promise<DownloadedOtaUpdate | null> {
  const selected = selectOtaBundleAttempt(
    remote,
    local.version,
    state.download?.bundlePath,
  );
  if (!selected) return downloadPerFile(local, remote, changed, deleted, state.download?.totalBytes ?? 0, state, notify);
  const entry = selected.entry;
  if (entry.size > MAX_DOWNLOAD_BYTES) throw new Error("OTA bundle exceeds download limit");
  try {
    const schedule = () => nativePlatform.backgroundDownload.schedule({
      releaseId: remote.releaseId,
      url: bundleUrl(remote, entry),
      sha256: entry.sha256,
      size: entry.size,
    });
    let task = await nativePlatform.backgroundDownload.status(remote.releaseId);
    let rescheduledMissing = false;
    if (task.status === "failed") {
      await nativePlatform.backgroundDownload.remove(remote.releaseId);
      task = await schedule();
    } else if (task.status === "missing") {
      task = await schedule();
      rescheduledMissing = true;
    }
    state.download = {
      releaseId: remote.releaseId,
      version: remote.version,
      status: "downloading",
      downloadedBytes: task.bytesDownloaded,
      totalBytes: entry.size,
      nativeTaskId: task.id,
      expectedSha256: entry.sha256,
      bundlePath: entry.path,
    };
    await writeState(state);
    const pollingStartedAt = Date.now();
    let lastPersistedAt = pollingStartedAt;
    let lastPersistedPercent = Math.round(
      task.bytesDownloaded / Math.max(entry.size, 1) * 100,
    );
    let previousStatus: typeof task.status | null = null;
    while (true) {
      if (Date.now() - pollingStartedAt >= NATIVE_DOWNLOAD_TIMEOUT_MS) {
        throw new Error("OTA background download exceeded the one-hour polling limit");
      }
      const status = task.status ?? task.state ?? "failed";
      const action = nativeDownloadPollAction(status, rescheduledMissing);
      if (action === "complete") break;
      if (action === "fail") {
        throw new Error(
          status === "missing"
            ? "Native OTA task is still missing after one reschedule"
            : task.error ?? "OTA background download failed",
        );
      }
      if (action === "reschedule") {
        task = await schedule();
        rescheduledMissing = true;
        continue;
      }
      const verifyingBundle = task.status === "verifying";
      const progressPercent = Math.round(
        task.bytesDownloaded / Math.max(entry.size, 1) * 100,
      );
      const now = Date.now();
      const enteredVerifying = verifyingBundle && previousStatus !== "verifying";
      const persistProgress = enteredVerifying || shouldPersistNativeDownloadProgress(
        lastPersistedPercent,
        progressPercent,
        lastPersistedAt,
        now,
      );
      await updateStatus(state, {
        progress: progressPercent,
        statusKey: verifyingBundle ? "ota.bundleVerifying" : "ota.downloading",
        downloadedBytes: task.bytesDownloaded,
        totalBytes: entry.size,
      }, notify, persistProgress);
      if (persistProgress) {
        lastPersistedAt = now;
        lastPersistedPercent = progressPercent;
      }
      previousStatus = task.status;
      await new Promise((resolve) => window.setTimeout(resolve, NATIVE_DOWNLOAD_POLL_MS));
      task = await nativePlatform.backgroundDownload.status(remote.releaseId);
      state.download = reconcileNativeDownloadTask(state.download, task);
    }
    state.download.status = "extracting";
    await updateStatus(state, { progress: 100, statusKey: "ota.verifying", downloadedBytes: entry.size, totalBytes: entry.size }, notify);
    await provisionWorkingBaseline(local, state, notify);
    await capacitorOtaAdapter.prepareRelease(local.version, remote.version);
    const expected = Object.fromEntries(
      (selected.kind === "delta" ? changed : Object.keys(remote.files)).map((path) => [path, remote.files[path]!]),
    );
    await extractOtaBundle(nativeTaskChunks(task), expected, {
      begin: (path) => capacitorOtaAdapter.beginReleaseFile(remote.version, path),
      append: (path, bytes) => capacitorOtaAdapter.appendReleaseFile(remote.version, path, bytes),
      async verify(path, file) {
        const bytes = await capacitorOtaAdapter.readReleaseFile(remote.version, path);
        if ((await sha256(bytes)) !== file.sha256) throw new Error(`OTA extracted file checksum mismatch: ${path}`);
      },
    });
    await nativePlatform.backgroundDownload.remove(remote.releaseId);
    return finalizePending(local, remote, changed, deleted, entry.size, state, notify);
  } catch (error) {
    const full = remote.bundles?.full;
    if (selected.kind !== "delta" || !full || full.path === selected.entry.path) throw error;

    logWarn("OTA delta bundle failed; retrying with full bundle", error);
    await nativePlatform.backgroundDownload.remove(remote.releaseId);
    await capacitorOtaAdapter.cleanupTransaction(remote.version);
    delete state.resume;
    state.download = {
      releaseId: remote.releaseId,
      version: remote.version,
      status: "requested",
      downloadedBytes: 0,
      totalBytes: full.size,
      expectedSha256: full.sha256,
      bundlePath: full.path,
    };
    if (state.discovered) state.discovered.totalBytes = full.size;
    await writeState(state);

    const requiredFreeBytes = requiredOtaFreeBytes(remote.size, full.size);
    try {
      const { availableBytes } = await nativePlatform.storageCapacity.getFreeSpace();
      if (availableBytes < requiredFreeBytes) {
        await updateStatus(state, {
          progress: 0,
          statusKey: "ota.insufficientStorage",
          downloadedBytes: 0,
          totalBytes: full.size,
          requiredFreeBytes,
        }, notify);
        return null;
      }
    } catch (capacityError) {
      logWarn("Free-space preflight unavailable before full-bundle fallback; continuing", capacityError);
    }
    return downloadNativeBundle(local, remote, changed, deleted, state, notify);
  }
}

let activeCheck: Promise<DownloadedOtaUpdate | null> | null = null;

export const otaUpdateService = {
  isEnabled(): boolean {
    return Boolean(otaPublicEnv().otaManifestUrl && otaPublicEnv().otaPublicKey && capacitorOtaAdapter.isAvailable());
  },

  getState: readOtaState,

  async getPending(): Promise<DownloadedOtaUpdate | null> {
    return (await readOtaState()).pending ?? null;
  },

  async enforceRevocations(): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const controller = new AbortController();
    let timeout = 0;
    try {
      const document = await Promise.race([
        otaRevocationService.getDocument(controller.signal),
        new Promise<OtaRevocationDocument | null>((resolve) => {
          timeout = window.setTimeout(() => {
            controller.abort();
            void otaRevocationService.getPersistedDocument().then(resolve);
          }, REVOCATION_TIMEOUT_MS);
        }),
      ]);
      if (!document) return false;
      const revoked = new Set(document.revokedVersions);
      const state = await readOtaState();
      if (state.pending && revoked.has(state.pending.version)) {
        recordOtaOutcome({
          outcome: "revocation_applied",
          localVersion: otaPublicEnv().webBundleVersion,
          targetVersion: state.pending.version,
          releaseId: state.pending.releaseId,
        });
        await capacitorOtaAdapter.cleanupTransaction(state.pending.version);
        await nativePlatform.backgroundDownload.remove(state.pending.releaseId);
        delete state.pending;
        state.lastStatusKey = "ota.revoked";
      }
      if (!revoked.has(otaPublicEnv().webBundleVersion)) {
        await writeState(state);
        return false;
      }

      recordOtaOutcome({
        outcome: "revocation_applied",
        localVersion: otaPublicEnv().webBundleVersion,
        targetVersion: otaPublicEnv().webBundleVersion,
      });

      if (state.download) await nativePlatform.backgroundDownload.remove(state.download.releaseId);
      if (state.activation) await capacitorOtaAdapter.cleanupTransaction(state.activation.version);
      delete state.pending;
      delete state.download;
      delete state.discovered;
      delete state.resume;
      delete state.activation;
      delete state.workingBaselineVersion;
      state.lastStatusKey = "ota.revoked";
      await writeState(state);
      await capacitorOtaAdapter.revertToNativeBaseline();
      return true;
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }
  },

  async confirmRunningBundle(): Promise<void> {
    const state = await readOtaState();
    const activation = state.activation;
    if (!activation || activation.version !== otaPublicEnv().webBundleVersion) return;
    const baseVersion = activation.baseVersion || otaPublicEnv().webBundleVersion;
    await capacitorOtaAdapter.persistCurrentPath();
    await capacitorOtaAdapter.confirmActivation(
      activation.version,
      baseVersion,
    );
    recordOtaOutcome({
      outcome: "activation_succeeded",
      localVersion: baseVersion,
      targetVersion: activation.version,
      releaseId: activation.releaseId,
    });
    delete state.activation;
    delete state.pending;
    state.lastStatusKey = "ota.current";
    await writeState(state);
  },

  async discardPending(existingState?: OtaStoredState): Promise<void> {
    const state = existingState ?? await readOtaState();
    if (!state.pending) return;
    await capacitorOtaAdapter.cleanupTransaction(state.pending.version);
    await nativePlatform.backgroundDownload.remove(state.pending.releaseId);
    delete state.pending;
    state.lastStatusKey = "ota.revoked";
    await writeState(state);
  },

  /**
   * Hold a downloaded release that is not cleared to install yet.
   */
  async holdPendingUntilAllowed(
    state: OtaStoredState,
    reason: OtaReleaseAccess["reason"],
  ): Promise<void> {
    state.lastStatusKey =
      reason === "rollout_pending" ? "ota.ready" : "ota.awaitingApproval";
    await writeState(state);
  },

  async reverifyPendingApproval(identity?: OtaIdentity): Promise<void> {
    const state = await readOtaState();
    if (!state.pending) return;
    const access = await otaApiService.getReleaseAccess({ releaseId: state.pending.releaseId, version: state.pending.version, identity });
    if (!access.allowed) await this.holdPendingUntilAllowed(state, access.reason);
  },

  async activatePending(identity?: OtaIdentity, approvalAlreadyChecked = false): Promise<void> {
    const state = await readOtaState();
    const pending = state.pending;
    if (!isReadyForOtaActivation(pending) || !pending) return;
    const baseVersion = pending.baseVersion || otaPublicEnv().webBundleVersion;
    if (!approvalAlreadyChecked) {
      const access = await otaApiService.getReleaseAccess({ releaseId: pending.releaseId, version: pending.version, identity });
      if (!access.allowed) {
        await this.holdPendingUntilAllowed(state, access.reason);
        return;
      }
    }
    state.activation = {
      version: pending.version,
      baseVersion,
      releaseId: pending.releaseId,
      previousPath: await capacitorOtaAdapter.currentBasePath(),
      startedAt: Date.now(),
    };
    await writeState(state);
    try {
      // The candidate was completed during download; activation is one switch.
      await capacitorOtaAdapter.activate(pending.path);
    } catch (error) {
      recordOtaOutcome({
        outcome: "activation_failed",
        localVersion: baseVersion,
        targetVersion: pending.version,
        releaseId: pending.releaseId,
        reason: otaFailureReason(error),
      });
      await capacitorOtaAdapter.rollbackDelta(pending.version);
      delete state.activation;
      await writeState(state);
      throw error;
    }
  },

  async checkAndDownload(
    notify?: (progress: OtaDownloadProgress) => void,
    identity?: OtaIdentity,
  ): Promise<DownloadedOtaUpdate | null> {
    if (!this.isEnabled()) return null;
    if (await this.enforceRevocations()) return null;
    if (activeCheck) return activeCheck;
    activeCheck = (async () => {
      const state = await readOtaState();
      let staleFileRetryUsed = false;
      let passes = 0;
      while (passes < 4) {
       passes += 1;
       try {
        await updateStatus(state, { progress: 0, statusKey: "ota.checking", downloadedBytes: 0, totalBytes: 0 }, notify);
        let prefetchedRemote: OtaManifest | null = null;
        if (state.pending) {
          prefetchedRemote = await otaApiService.getManifest(otaPublicEnv().otaManifestUrl);
          validateManifest(prefetchedRemote, true);
          if (!(await verifyManifest(prefetchedRemote))) throw new Error("OTA manifest signature is invalid");
          if (await otaRevocationService.isVersionRevoked(prefetchedRemote.version)) {
            state.lastSuccessfulCheckAt = Date.now();
            await writeState(state);
            await this.reverifyPendingApproval(identity);
            return (await readOtaState()).pending ?? null;
          }
          if (!shouldSupersedePending(state.pending.version, prefetchedRemote.version)) {
            state.lastSuccessfulCheckAt = Date.now();
            await writeState(state);
            await this.reverifyPendingApproval(identity);
            return (await readOtaState()).pending ?? null;
          }
          await capacitorOtaAdapter.cleanupTransaction(state.pending.version);
          await nativePlatform.backgroundDownload.remove(state.pending.releaseId);
          delete state.pending;
          await updateStatus(state, { progress: 0, statusKey: "ota.superseded", downloadedBytes: 0, totalBytes: 0 }, notify);
        }
        const local = await otaApiService.getLocalManifest();
        if (
          state.download &&
          state.discovered?.releaseId === state.download.releaseId
        ) {
          const stored = state.discovered;
          const remote = stored.manifest;
          validateManifest(local, false);
          validateManifest(remote, true);
          if (!(await verifyManifest(remote))) throw new Error("Stored OTA manifest signature is invalid");
          const liveRemote = await otaApiService.getManifest(otaPublicEnv().otaManifestUrl);
          validateManifest(liveRemote, true);
          if (
            (await verifyManifest(liveRemote)) &&
            shouldSupersedePending(remote.version, liveRemote.version)
          ) {
            await nativePlatform.backgroundDownload.remove(remote.releaseId);
            await capacitorOtaAdapter.cleanupTransaction(remote.version);
            delete state.download;
            delete state.discovered;
            await updateStatus(state, { progress: 0, statusKey: "ota.superseded", downloadedBytes: 0, totalBytes: 0 }, notify);
            continue;
          }
          recordOtaOutcome({
            outcome: "check_performed",
            localVersion: local.version,
            targetVersion: remote.version,
            releaseId: remote.releaseId,
          });
          if (await otaRevocationService.isVersionRevoked(remote.version)) {
            await nativePlatform.backgroundDownload.remove(remote.releaseId);
            delete state.download;
            delete state.discovered;
            state.lastStatusKey = "ota.revoked";
            await writeState(state);
            return null;
          }
          const access = await otaApiService.getReleaseAccess({ releaseId: remote.releaseId, version: remote.version, identity });
          if (!access.allowed) {
            state.lastStatusKey =
              access.reason === "rollout_pending" ? "ota.noUpdate" : "ota.awaitingApproval";
            await writeState(state);
            return null;
          }
          recordOtaOutcome({
            outcome: "download_started",
            localVersion: local.version,
            targetVersion: remote.version,
            releaseId: remote.releaseId,
          });
          return nativePlatform.backgroundDownload.isAvailable() && selectOtaBundle(remote, local.version)
            ? downloadNativeBundle(local, remote, stored.changedFiles, stored.deletedFiles, state, notify)
            : downloadPerFile(local, remote, stored.changedFiles, stored.deletedFiles, stored.totalBytes, state, notify);
        }
        const remote = prefetchedRemote ?? await otaApiService.getManifest(otaPublicEnv().otaManifestUrl);
        validateManifest(local, false);
        validateManifest(remote, true);
        if (!(await verifyManifest(remote))) throw new Error("OTA manifest signature is invalid");
        recordOtaOutcome({
          outcome: "check_performed",
          localVersion: local.version,
          targetVersion: remote.version,
          releaseId: remote.releaseId,
        });
        if (await otaRevocationService.isVersionRevoked(remote.version)) {
          state.lastSuccessfulCheckAt = Date.now();
          await updateStatus(state, { progress: 100, statusKey: "ota.revoked", downloadedBytes: 0, totalBytes: 0 }, notify);
          return null;
        }
        if (state.failedReleaseId === remote.releaseId || compareOtaVersions(remote.version, local.version) <= 0) {
          state.lastSuccessfulCheckAt = Date.now();
          await updateStatus(state, { progress: 100, statusKey: "ota.noUpdate", downloadedBytes: 0, totalBytes: 0 }, notify);
          return null;
        }
        const installedNativeVersion = await capacitorOtaAdapter.nativeVersion();
        const capabilityDecision = await evaluateOtaCapabilities(
          remote.requiredCapabilities,
          capabilities,
          remote.optionalCapabilities,
        );
        if (compareOtaVersions(remote.minimumNativeVersion, installedNativeVersion) > 0 || !capabilityDecision.compatible) {
          state.lastSuccessfulCheckAt = Date.now();
          await updateStatus(state, { progress: 100, statusKey: "ota.nativeUpdateRequired", nativeUpdateRequired: true }, notify);
          return null;
        }
        if (capabilityDecision.missingOptionalCapabilities.length > 0) {
          recordOtaOutcome({
            outcome: "optional_capabilities_missing",
            localVersion: local.version,
            targetVersion: remote.version,
            releaseId: remote.releaseId,
            reason: capabilityDecision.missingOptionalCapabilities.join(","),
          });
        }
        const access = await otaApiService.getReleaseAccess({ releaseId: remote.releaseId, version: remote.version, identity });
        if (!access.allowed) {
          state.lastSuccessfulCheckAt = Date.now();
          await updateStatus(state, {
            progress: 100,
            statusKey: access.reason === "rollout_pending" ? "ota.noUpdate" : "ota.awaitingApproval",
          }, notify);
          return null;
        }
        const diff = planOtaDelta(local, remote);
        recordOtaOutcome({
          outcome: "update_discovered",
          localVersion: local.version,
          targetVersion: remote.version,
          releaseId: remote.releaseId,
        });
        const selected = selectOtaBundle(remote, local.version);
        const totalBytes = selected?.entry.size ?? diff.downloadBytes;
        if (totalBytes > MAX_DOWNLOAD_BYTES) throw new Error("OTA download exceeds size limit");
        const requiredFreeBytes = requiredOtaFreeBytes(remote.size, totalBytes);
        try {
          const { availableBytes } = await nativePlatform.storageCapacity.getFreeSpace();
          if (availableBytes < requiredFreeBytes) {
            await updateStatus(state, {
              progress: 0,
              statusKey: "ota.insufficientStorage",
              downloadedBytes: 0,
              totalBytes,
              requiredFreeBytes,
            }, notify);
            return null;
          }
        } catch (error) {
          logWarn("Free-space preflight unavailable; continuing", error);
        }
        state.lastSuccessfulCheckAt = Date.now();
        delete state.requiredFreeBytes;
        state.discovered = {
          releaseId: remote.releaseId,
          version: remote.version,
          totalBytes,
          manifest: remote,
          changedFiles: diff.changed,
          deletedFiles: diff.deleted,
        };
        state.download = {
          releaseId: remote.releaseId,
          version: remote.version,
          status: "requested",
          downloadedBytes: 0,
          totalBytes,
        };
        await writeState(state);
        recordOtaOutcome({
          outcome: "download_started",
          localVersion: local.version,
          targetVersion: remote.version,
          releaseId: remote.releaseId,
        });
        return nativePlatform.backgroundDownload.isAvailable() && selected
          ? downloadNativeBundle(local, remote, diff.changed, diff.deleted, state, notify)
          : downloadPerFile(local, remote, diff.changed, diff.deleted, diff.downloadBytes, state, notify);
      } catch (error) {
        if (error instanceof OtaStaleRemoteFileError && !staleFileRetryUsed) {
          staleFileRetryUsed = true;
          const staleVersion = state.download?.version ?? state.discovered?.version;
          if (state.download) {
            await nativePlatform.backgroundDownload.remove(state.download.releaseId);
          }
          if (staleVersion) await capacitorOtaAdapter.cleanupTransaction(staleVersion);
          delete state.download;
          delete state.discovered;
          delete state.resume;
          state.lastStatusKey = "ota.checking";
          await writeState(state);
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
          continue;
        }
        state.lastStatusKey = "ota.failed";
        await writeState(state);
        const targetVersion = state.download?.version ?? state.discovered?.version ?? "unknown";
        const releaseId = state.download?.releaseId ?? state.discovered?.releaseId;
        const reason = otaFailureReason(error);
        recordOtaOutcome({
          outcome: "download_failed",
          localVersion: otaPublicEnv().webBundleVersion,
          targetVersion,
          releaseId,
          reason,
        });
        if (reason === "verification") {
          recordOtaOutcome({
            outcome: "verification_failed",
            localVersion: otaPublicEnv().webBundleVersion,
            targetVersion,
            releaseId,
            reason,
          });
        }
        throw error;
      }
      }
      state.lastStatusKey = "ota.noUpdate";
      await writeState(state);
      return null;
    })().finally(() => { activeCheck = null; });
    return activeCheck;
  },

  async checkDailyAndDownload(
    notify?: (progress: OtaDownloadProgress) => void,
    identity?: OtaIdentity,
    now = Date.now(),
  ): Promise<DownloadedOtaUpdate | null> {
    const state = await readOtaState();
    const due =
      (identity ? otaIdentity().isSuperAdmin(identity.uid, identity.phone) : false) ||
      isDailyOtaCheckDue(state.lastSuccessfulCheckAt, now);
    const clamped = clampFutureOtaCheckTimestamp(state.lastSuccessfulCheckAt, now);
    if (clamped !== state.lastSuccessfulCheckAt) {
      state.lastSuccessfulCheckAt = clamped;
      await writeState(state);
    }
    if (state.pending) await this.reverifyPendingApproval(identity);
    if (state.download || due)
      return this.checkAndDownload(notify, identity);
    return null;
  },

  async prepareAtSplash(identity?: OtaIdentity): Promise<void> {
    if (!this.isEnabled()) return;
    const state = await readOtaState();
    if (state.activation) {
      if (state.activation.version === otaPublicEnv().webBundleVersion) return;
      if (state.pending) state.failedReleaseId = state.pending.releaseId;
      const currentPath = await capacitorOtaAdapter.currentBasePath();
      if (currentPath !== state.activation.previousPath) {
        state.activation.rollbackPending = true;
        await writeState(state);
        await capacitorOtaAdapter.activate(state.activation.previousPath);
        return;
      }
      await capacitorOtaAdapter.rollbackDelta(state.activation.version);
      recordOtaOutcome({
        outcome: "rollback_performed",
        localVersion: state.activation.baseVersion || otaPublicEnv().webBundleVersion,
        targetVersion: state.activation.version,
        releaseId: state.activation.releaseId,
      });
      delete state.activation;
      delete state.pending;
      await writeState(state);
      return;
    }
    if (!state.pending?.ready) return;

    const controller = new AbortController();
    let approved = true;
    let accessReason: OtaReleaseAccess["reason"] = "awaiting_approval";
    try {
      const access = await Promise.race([
        otaApiService.getReleaseAccess({ releaseId: state.pending.releaseId, version: state.pending.version, identity }, controller.signal),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("approval timeout")), APPROVAL_TIMEOUT_MS)),
      ]);
      approved = access.allowed;
      accessReason = access.reason;
    } catch (error) {
      logWarn("Pending approval could not be rechecked within 2 seconds; activating", error);
    } finally {
      controller.abort();
    }
    if (!approved) {
      await this.holdPendingUntilAllowed(state, accessReason);
      return;
    }
    await this.activatePending(identity, true);
  },
};
