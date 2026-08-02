/** Single responsibility: securely discover, stage, and activate resumable OTA releases. */
import { publicEnv } from "@/core/config/public-env";
import { capabilities, nativePlatform } from "@/native-platform";
import type { BackgroundDownloadTask } from "@/native-platform";
import { capacitorOtaAdapter } from "@/platform/ota/capacitor-ota-adapter";
import {
  asolDbGet,
  asolDbSet,
  ASOL_DB_STORES,
} from "@/modules/data-access/browser/asol-db";

import { otaApiService } from "./ota-api-service";
import { evaluateOtaCapabilities } from "../utils/ota-capability-gate";
import {
  bundleUrl,
  extractOtaBundle,
  selectOtaBundle,
  verifyOtaBundleChunks,
} from "../utils/ota-bundle";
import {
  pendingDeltaFiles,
  planOtaDelta,
  runBounded,
} from "../utils/ota-delta-plan";
import {
  isDailyOtaCheckDue,
  isReadyForOtaActivation,
  migrateOtaState,
  reconcileNativeDownloadTask,
} from "../utils/ota-state";
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
export const OTA_DOWNLOAD_CONCURRENCY = 6;
const LOCAL_MANIFEST_FILE = "asol-web-manifest.json";
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const APPROVAL_TIMEOUT_MS = 2_000;

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

function compareVersions(left: string, right: string): number {
  const parse = (value: string) =>
    value.split("-")[0]!.split(".").map((part) => Number(part) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function sortedFiles(files: Record<string, OtaFileEntry>): Record<string, OtaFileEntry> {
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
    bundles: payload.bundles,
  });
}

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
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version))
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

  const entries = Object.entries(manifest.files);
  if (entries.length !== manifest.fileCount) throw new Error("OTA manifest file count mismatch");
  const total = entries.reduce((sum, [filePath, file]) => {
    safeFilePath(filePath);
    if (!/^[a-f0-9]{64}$/i.test(file.sha256)) throw new Error(`Invalid OTA file hash: ${filePath}`);
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error(`Invalid OTA file size: ${filePath}`);
    return sum + file.size;
  }, 0);
  if (total !== manifest.size) throw new Error("OTA manifest total size mismatch");

  for (const bundle of [manifest.bundles?.full, manifest.bundles?.delta]) {
    if (!bundle) continue;
    safeFilePath(bundle.path);
    if (!/^[a-f0-9]{64}$/i.test(bundle.sha256) || !Number.isSafeInteger(bundle.size) || bundle.size <= 0)
      throw new Error("OTA bundle metadata is invalid");
  }
}

async function verifyManifest(manifest: OtaManifest): Promise<boolean> {
  if (!publicEnv.otaPublicKey) return false;
  const key = await crypto.subtle.importKey(
    "spki",
    decodeBase64(publicEnv.otaPublicKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    decodeBase64(manifest.signature ?? ""),
    new TextEncoder().encode(canonicalPayload(manifestPayload(manifest))),
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
): Promise<void> {
  state.lastStatusKey = progress.statusKey;
  state.nativeUpdateRequired = progress.nativeUpdateRequired;
  if (state.download) {
    state.download.downloadedBytes = progress.downloadedBytes ?? state.download.downloadedBytes;
    state.download.totalBytes = progress.totalBytes ?? state.download.totalBytes;
  }
  await writeState(state);
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

async function provisionWorkingBaseline(localManifest: OtaManifest, state: OtaStoredState): Promise<void> {
  const currentPath = await capacitorOtaAdapter.currentBasePath();
  if (
    (await capacitorOtaAdapter.isWorkingPath(currentPath)) ||
    state.workingBaselineVersion === localManifest.version
  ) return;
  await runBounded(Object.entries(localManifest.files), OTA_DOWNLOAD_CONCURRENCY, async ([path, expected]) => {
    const bytes = await otaApiService.getCurrentFile(path);
    if ((await sha256(bytes)) !== expected.sha256) throw new Error(`OTA baseline checksum mismatch: ${path}`);
    await capacitorOtaAdapter.writeWorkingFile(path, bytes);
  });
  await capacitorOtaAdapter.writeWorkingFile(
    LOCAL_MANIFEST_FILE,
    new TextEncoder().encode(JSON.stringify(localManifest, null, 2)).buffer,
  );
  state.workingBaselineVersion = localManifest.version;
}

async function finalizePending(
  localManifest: OtaManifest,
  remote: OtaManifest,
  changed: string[],
  deleted: string[],
  totalBytes: number,
  state: OtaStoredState,
): Promise<DownloadedOtaUpdate> {
  await capacitorOtaAdapter.writeReleaseTextFile(remote.version, LOCAL_MANIFEST_FILE, JSON.stringify(remote, null, 2));
  await provisionWorkingBaseline(localManifest, state);
  const pending: DownloadedOtaUpdate = {
    version: remote.version,
    releaseId: remote.releaseId,
    path: await capacitorOtaAdapter.workingPath(),
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
  const resumable = state.resume?.releaseId === remote.releaseId;
  if (resumable) await capacitorOtaAdapter.ensureRelease(remote.version);
  else {
    await capacitorOtaAdapter.prepareRelease(remote.version);
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
    if ((await sha256(bytes)) !== expected.sha256) throw new Error(`OTA remote file checksum mismatch: ${path}`);
    await capacitorOtaAdapter.writeReleaseFile(remote.version, path, bytes);
    resume.completed[path] = expected.sha256;
    downloaded += expected.size;
    state.resume = { ...resume, completed: { ...resume.completed } };
    await updateStatus(state, { progress: Math.round(downloaded / Math.max(totalBytes, 1) * 100), statusKey: "ota.downloading", downloadedBytes: downloaded, totalBytes }, notify);
  });
  return finalizePending(local, remote, changed, deleted, totalBytes, state);
}

async function downloadNativeBundle(
  local: OtaManifest,
  remote: OtaManifest,
  changed: string[],
  deleted: string[],
  state: OtaStoredState,
  notify?: (progress: OtaDownloadProgress) => void,
): Promise<DownloadedOtaUpdate> {
  const selected = selectOtaBundle(remote, local.version);
  if (!selected) return downloadPerFile(local, remote, changed, deleted, state.download?.totalBytes ?? 0, state, notify);
  const entry = selected.entry;
  if (entry.size > MAX_DOWNLOAD_BYTES) throw new Error("OTA bundle exceeds download limit");
  let task = await nativePlatform.backgroundDownload.status(remote.releaseId);
  if (task.status === "missing" || task.status === "failed") {
    if (task.status === "failed") await nativePlatform.backgroundDownload.remove(remote.releaseId);
    task = await nativePlatform.backgroundDownload.schedule({
      releaseId: remote.releaseId,
      url: bundleUrl(remote, entry),
      sha256: entry.sha256,
      size: entry.size,
    });
    if (task.status === "missing") {
      throw new Error("Native OTA task could not be recovered");
    }
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
  while (task.status !== "completed") {
    if (task.status === "failed") throw new Error(task.error ?? "OTA background download failed");
    await updateStatus(state, {
      progress: Math.round(task.bytesDownloaded / Math.max(entry.size, 1) * 100),
      statusKey: "ota.downloading",
      downloadedBytes: task.bytesDownloaded,
      totalBytes: entry.size,
    }, notify);
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
    task = await nativePlatform.backgroundDownload.status(remote.releaseId);
    state.download = reconcileNativeDownloadTask(state.download, task);
  }
  await verifyOtaBundleChunks(nativeTaskChunks(task), entry.sha256, entry.size);
  state.download.status = "extracting";
  await updateStatus(state, { progress: 100, statusKey: "ota.verifying", downloadedBytes: entry.size, totalBytes: entry.size }, notify);
  await capacitorOtaAdapter.prepareRelease(remote.version);
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
  return finalizePending(local, remote, changed, deleted, entry.size, state);
}

let activeCheck: Promise<DownloadedOtaUpdate | null> | null = null;

export const otaUpdateService = {
  isEnabled(): boolean {
    return Boolean(publicEnv.otaManifestUrl && publicEnv.otaPublicKey && capacitorOtaAdapter.isAvailable());
  },

  getState: readOtaState,

  async getPending(): Promise<DownloadedOtaUpdate | null> {
    return (await readOtaState()).pending ?? null;
  },

  async confirmRunningBundle(): Promise<void> {
    const state = await readOtaState();
    if (state.activation?.version !== publicEnv.webBundleVersion) return;
    await capacitorOtaAdapter.persistCurrentPath();
    await capacitorOtaAdapter.cleanupTransaction(state.activation.version);
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

  async reverifyPendingApproval(identity?: OtaIdentity): Promise<void> {
    const state = await readOtaState();
    if (!state.pending) return;
    const access = await otaApiService.getReleaseAccess({ releaseId: state.pending.releaseId, version: state.pending.version, identity });
    if (!access.allowed) await this.discardPending(state);
  },

  async activatePending(identity?: OtaIdentity, approvalAlreadyChecked = false): Promise<void> {
    const state = await readOtaState();
    const pending = state.pending;
    if (!isReadyForOtaActivation(pending) || !pending) return;
    if (!approvalAlreadyChecked) {
      const access = await otaApiService.getReleaseAccess({ releaseId: pending.releaseId, version: pending.version, identity });
      if (!access.allowed) { await this.discardPending(state); return; }
    }
    state.activation = {
      version: pending.version,
      releaseId: pending.releaseId,
      previousPath: await capacitorOtaAdapter.currentBasePath(),
      startedAt: Date.now(),
    };
    await writeState(state);
    try {
      await capacitorOtaAdapter.applyDelta(pending.version, pending.changedFiles, pending.deletedFiles);
      await capacitorOtaAdapter.activate(pending.path);
    } catch (error) {
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
    if (activeCheck) return activeCheck;
    activeCheck = (async () => {
      const state = await readOtaState();
      if (state.pending) {
        await this.reverifyPendingApproval(identity);
        return (await readOtaState()).pending ?? null;
      }
      try {
        await updateStatus(state, { progress: 0, statusKey: "ota.checking", downloadedBytes: 0, totalBytes: 0 }, notify);
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
          const access = await otaApiService.getReleaseAccess({ releaseId: remote.releaseId, version: remote.version, identity });
          if (!access.allowed) {
            await nativePlatform.backgroundDownload.remove(remote.releaseId);
            delete state.download;
            delete state.discovered;
            state.lastStatusKey = "ota.revoked";
            await writeState(state);
            return null;
          }
          return nativePlatform.backgroundDownload.isAvailable() && selectOtaBundle(remote, local.version)
            ? downloadNativeBundle(local, remote, stored.changedFiles, stored.deletedFiles, state, notify)
            : downloadPerFile(local, remote, stored.changedFiles, stored.deletedFiles, stored.totalBytes, state, notify);
        }
        const remote = await otaApiService.getManifest(publicEnv.otaManifestUrl);
        validateManifest(local, false);
        validateManifest(remote, true);
        if (!(await verifyManifest(remote))) throw new Error("OTA manifest signature is invalid");
        if (state.failedReleaseId === remote.releaseId || compareVersions(remote.version, local.version) <= 0) {
          state.lastSuccessfulCheckAt = Date.now();
          await updateStatus(state, { progress: 100, statusKey: "ota.noUpdate", downloadedBytes: 0, totalBytes: 0 }, notify);
          return null;
        }
        const installedNativeVersion = await capacitorOtaAdapter.nativeVersion();
        const capabilityDecision = await evaluateOtaCapabilities(remote.requiredCapabilities, capabilities);
        if (compareVersions(remote.minimumNativeVersion, installedNativeVersion) > 0 || !capabilityDecision.compatible) {
          state.lastSuccessfulCheckAt = Date.now();
          await updateStatus(state, { progress: 100, statusKey: "ota.nativeUpdateRequired", nativeUpdateRequired: true }, notify);
          return null;
        }
        const access = await otaApiService.getReleaseAccess({ releaseId: remote.releaseId, version: remote.version, identity });
        if (!access.allowed) {
          state.lastSuccessfulCheckAt = Date.now();
          await updateStatus(state, { progress: 100, statusKey: "ota.awaitingApproval" }, notify);
          return null;
        }
        const diff = planOtaDelta(local, remote);
        state.lastSuccessfulCheckAt = Date.now();
        const selected = selectOtaBundle(remote, local.version);
        const totalBytes = selected?.entry.size ?? diff.downloadBytes;
        if (totalBytes > MAX_DOWNLOAD_BYTES) throw new Error("OTA download exceeds size limit");
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
        return nativePlatform.backgroundDownload.isAvailable() && selected
          ? downloadNativeBundle(local, remote, diff.changed, diff.deleted, state, notify)
          : downloadPerFile(local, remote, diff.changed, diff.deleted, diff.downloadBytes, state, notify);
      } catch (error) {
        state.lastStatusKey = "ota.failed";
        await writeState(state);
        throw error;
      }
    })().finally(() => { activeCheck = null; });
    return activeCheck;
  },

  async checkDailyAndDownload(
    notify?: (progress: OtaDownloadProgress) => void,
    identity?: OtaIdentity,
    now = Date.now(),
  ): Promise<DownloadedOtaUpdate | null> {
    const state = await readOtaState();
    if (state.pending) await this.reverifyPendingApproval(identity);
    if (state.download || isDailyOtaCheckDue(state.lastSuccessfulCheckAt, now))
      return this.checkAndDownload(notify, identity);
    return null;
  },

  async prepareAtSplash(identity?: OtaIdentity): Promise<void> {
    if (!this.isEnabled()) return;
    const state = await readOtaState();
    if (state.activation) {
      if (state.activation.version === publicEnv.webBundleVersion) return;
      if (state.pending) state.failedReleaseId = state.pending.releaseId;
      await capacitorOtaAdapter.rollbackDelta(state.activation.version);
      const previousPath = state.activation.previousPath;
      delete state.activation;
      delete state.pending;
      await writeState(state);
      await capacitorOtaAdapter.activate(previousPath);
      return;
    }
    if (!state.pending?.ready) return;

    const controller = new AbortController();
    let approved = true;
    try {
      const access = await Promise.race([
        otaApiService.getReleaseAccess({ releaseId: state.pending.releaseId, version: state.pending.version, identity }, controller.signal),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("approval timeout")), APPROVAL_TIMEOUT_MS)),
      ]);
      approved = access.allowed;
    } catch (error) {
      // Approval was proven before download. Offline/timeout activation is the
      // deliberate bounded gap; the foreground session rechecks revocation.
      logWarn("Pending approval could not be rechecked within 2 seconds; activating", error);
    } finally {
      controller.abort();
    }
    if (!approved) { await this.discardPending(state); return; }
    await this.activatePending(identity, true);
  },
};
