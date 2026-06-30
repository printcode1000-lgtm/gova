import { publicEnv } from '@/core/config/public-env';
import { capacitorOtaAdapter } from '@/platform/ota/capacitor-ota-adapter';

import { otaApiService } from './ota-api-service';
import type {
  DownloadedOtaUpdate,
  OtaDownloadProgress,
  OtaFileEntry,
  OtaManifest,
  OtaManifestPayload,
  OtaStoredState,
} from '../types/ota.types';

const OTA_STATE_KEY = 'gova-ota-state-v1';
export const OTA_STATE_EVENT = 'gova:ota-state';
const MAX_CHANGED_BYTES = 50 * 1024 * 1024;
const LOCAL_MANIFEST_FILE = 'gova-web-manifest.json';

type OtaDiff = {
  changed: string[];
  deleted: string[];
  downloadBytes: number;
};

function logInfo(message: string, details?: unknown): void {
  if (details === undefined) console.info(`[GovaOTA] ${message}`);
  else console.info(`[GovaOTA] ${message}`, details);
}

function logWarn(message: string, details?: unknown): void {
  if (details === undefined) console.warn(`[GovaOTA] ${message}`);
  else console.warn(`[GovaOTA] ${message}`, details);
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
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  return encodeHex(await crypto.subtle.digest('SHA-256', bytes));
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string) => value.split('-')[0]!.split('.').map((part) => Number(part) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function sortedFiles(files: Record<string, OtaFileEntry>): Record<string, OtaFileEntry> {
  return Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right)));
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
    mandatory: manifest.mandatory,
    notes: manifest.notes,
    files: manifest.files,
  };
}

function safeFilePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    !normalized ||
    normalized.includes('../') ||
    normalized === '..' ||
    normalized.includes('\0')
  ) {
    throw new Error(`Unsafe OTA manifest file path: ${value}`);
  }
  return normalized;
}

function validateManifest(manifest: OtaManifest, options: { remote: boolean }): void {
  if (manifest.schemaVersion !== 2) throw new Error(`Unsupported OTA manifest schema: ${manifest.schemaVersion}`);
  if (manifest.delivery !== 'files') throw new Error(`Unsupported OTA delivery: ${manifest.delivery}`);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error(`Invalid OTA version: ${manifest.version}`);
  }
  if (!manifest.releaseId || (options.remote && !manifest.baseUrl.startsWith('https://'))) {
    throw new Error('Invalid OTA release metadata');
  }
  if (!Number.isSafeInteger(manifest.size) || manifest.size <= 0) {
    throw new Error('OTA manifest total size is invalid');
  }
  if (!Number.isSafeInteger(manifest.fileCount) || manifest.fileCount <= 0) {
    throw new Error('OTA manifest file count is invalid');
  }
  if (options.remote && !manifest.signature) throw new Error('OTA manifest signature is missing');

  const entries = Object.entries(manifest.files);
  if (entries.length !== manifest.fileCount) {
    throw new Error(`OTA manifest file count mismatch: ${entries.length} != ${manifest.fileCount}`);
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
    throw new Error(`OTA manifest total size mismatch: ${totalSize} != ${manifest.size}`);
  }
}

async function verifyManifest(manifest: OtaManifest): Promise<boolean> {
  if (!publicEnv.otaPublicKey) return false;
  const publicKey = await crypto.subtle.importKey(
    'spki',
    decodeBase64(publicEnv.otaPublicKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    decodeBase64(manifest.signature ?? ''),
    new TextEncoder().encode(canonicalPayload(manifestPayload(manifest))),
  );
}

function readState(): OtaStoredState {
  try {
    return JSON.parse(localStorage.getItem(OTA_STATE_KEY) ?? '{}') as OtaStoredState;
  } catch {
    return {};
  }
}

function writeState(state: OtaStoredState): void {
  localStorage.setItem(OTA_STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(OTA_STATE_EVENT, { detail: state }));
}

function diffManifests(localManifest: OtaManifest, remoteManifest: OtaManifest): OtaDiff {
  const changed = Object.entries(remoteManifest.files)
    .filter(([filePath, remoteFile]) => localManifest.files[filePath]?.sha256 !== remoteFile.sha256)
    .map(([filePath]) => filePath);
  const deleted = Object.keys(localManifest.files).filter((filePath) => !(filePath in remoteManifest.files));
  const downloadBytes = changed.reduce((total, filePath) => total + remoteManifest.files[filePath]!.size, 0);
  return { changed, deleted, downloadBytes };
}

function remoteFileUrl(manifest: OtaManifest, filePath: string): string {
  const baseUrl = manifest.baseUrl.replace(/\/$/, '');
  const encodedPath = safeFilePath(filePath).split('/').map(encodeURIComponent).join('/');
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
      logInfo('OTA disabled', {
        hasManifestUrl: Boolean(publicEnv.otaManifestUrl),
        hasPublicKey: Boolean(publicEnv.otaPublicKey),
        nativePlatform: capacitorOtaAdapter.isAvailable(),
      });
    }
    return enabled;
  },

  getState: readState,

  getPending(): DownloadedOtaUpdate | null {
    return readState().pending ?? null;
  },

  dismissPending(): DownloadedOtaUpdate | null {
    const state = readState();
    if (!state.pending) return null;
    state.pending.dismissedAt = Date.now();
    writeState(state);
    logInfo(`Pending update dismissed: ${state.pending.version}`);
    return state.pending;
  },

  async confirmRunningBundle(): Promise<void> {
    const state = readState();
    if (state.activation?.version !== publicEnv.webBundleVersion) return;
    await capacitorOtaAdapter.persistCurrentPath();
    logInfo(`OTA release persisted: ${state.activation.version}`);
    delete state.activation;
    delete state.pending;
    writeState(state);
  },

  async activatePending(): Promise<void> {
    const state = readState();
    if (!state.pending) return;
    const previousPath = await capacitorOtaAdapter.currentBasePath();
    state.activation = {
      version: state.pending.version,
      previousPath,
      startedAt: Date.now(),
    };
    writeState(state);
    logInfo(`Activating OTA release: ${state.pending.version}`, { path: state.pending.path });
    await capacitorOtaAdapter.activate(state.pending.path);
  },

  async checkAndDownload(
    onProgress?: (progress: OtaDownloadProgress) => void,
  ): Promise<DownloadedOtaUpdate | null> {
    if (!this.isEnabled()) return null;
    if (activeDownload) return activeDownload;

    activeDownload = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 60_000);
      try {
        onProgress?.({ progress: 8, statusKey: 'ota.checking', detail: 'Reading local manifest' });
        const localManifest = await otaApiService.getLocalManifest(controller.signal);
        validateManifest(localManifest, { remote: false });
        logInfo(`Local OTA version: ${localManifest.version}`, {
          fileCount: localManifest.fileCount,
          size: localManifest.size,
        });

        onProgress?.({
          progress: 12,
          statusKey: 'ota.checking',
          detail: `Current ${localManifest.version}`,
          currentVersion: localManifest.version,
        });
        const remoteManifest = await otaApiService.getManifest(publicEnv.otaManifestUrl, controller.signal);
        validateManifest(remoteManifest, { remote: true });
        logInfo(`Remote OTA version: ${remoteManifest.version}`, {
          fileCount: remoteManifest.fileCount,
          size: remoteManifest.size,
          releaseId: remoteManifest.releaseId,
        });

        onProgress?.({
          progress: 18,
          statusKey: 'ota.verifying',
          detail: `Remote ${remoteManifest.version}`,
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
        });
        if (!(await verifyManifest(remoteManifest))) {
          throw new Error('OTA manifest signature is invalid');
        }

        if (readState().failedReleaseId === remoteManifest.releaseId) {
          logWarn(`Skipping previously failed release: ${remoteManifest.releaseId}`);
          return null;
        }
        if (compareVersions(remoteManifest.version, localManifest.version) <= 0) {
          logInfo('No OTA update: remote version is not newer', {
            localVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
          });
          onProgress?.({
            progress: 22,
            statusKey: 'ota.noUpdate',
            detail: `${localManifest.version} = ${remoteManifest.version}`,
            currentVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
          });
          return null;
        }

        const existing = this.getPending();
        if (existing && compareVersions(existing.version, remoteManifest.version) >= 0) {
          logInfo(`Using already downloaded pending release: ${existing.version}`);
          return existing;
        }

        const diff = diffManifests(localManifest, remoteManifest);
        if (diff.downloadBytes > MAX_CHANGED_BYTES) {
          throw new Error(`OTA changed files exceed limit: ${diff.downloadBytes} bytes`);
        }
        logInfo('OTA diff calculated', {
          changedFiles: diff.changed.length,
          deletedFiles: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });
        onProgress?.({
          progress: 25,
          statusKey: 'ota.diffReady',
          detail: progressDetail(diff),
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });

        await capacitorOtaAdapter.prepareRelease(remoteManifest.version);
        const changedSet = new Set(diff.changed);
        const remoteEntries = Object.entries(remoteManifest.files);
        let processed = 0;

        for (const [filePath, expected] of remoteEntries) {
          const isChanged = changedSet.has(filePath);
          const source = isChanged ? 'remote' : 'current';
          const bytes = isChanged
            ? await otaApiService.getFile(remoteFileUrl(remoteManifest, filePath), controller.signal)
            : await otaApiService.getCurrentFile(filePath, controller.signal);
          const actualHash = await sha256(bytes);
          if (actualHash !== expected.sha256) {
            throw new Error(`OTA ${source} file checksum mismatch: ${filePath}`);
          }
          await capacitorOtaAdapter.writeReleaseFile(remoteManifest.version, filePath, bytes);

          processed += 1;
          const progress = 30 + Math.round((processed / remoteEntries.length) * 35);
          onProgress?.({
            progress,
            statusKey: isChanged ? 'ota.downloading' : 'ota.copying',
            detail: `${processed}/${remoteEntries.length} ${filePath}`,
            currentVersion: localManifest.version,
            remoteVersion: remoteManifest.version,
            changedFileCount: diff.changed.length,
            deletedFileCount: diff.deleted.length,
            downloadBytes: diff.downloadBytes,
          });
        }

        onProgress?.({
          progress: 68,
          statusKey: 'ota.installing',
          detail: `Writing ${LOCAL_MANIFEST_FILE}`,
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });
        await capacitorOtaAdapter.writeReleaseTextFile(
          remoteManifest.version,
          LOCAL_MANIFEST_FILE,
          JSON.stringify(remoteManifest, null, 2),
        );

        const path = await capacitorOtaAdapter.releasePath(remoteManifest.version);
        const pending: DownloadedOtaUpdate = {
          version: remoteManifest.version,
          releaseId: remoteManifest.releaseId,
          path,
          size: diff.downloadBytes,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          notes: remoteManifest.notes,
          downloadedAt: Date.now(),
        };
        writeState({ ...readState(), pending });
        logInfo(`OTA release ready: ${remoteManifest.version}`, pending);
        onProgress?.({
          progress: 70,
          statusKey: 'ota.downloaded',
          detail: progressDetail(diff),
          currentVersion: localManifest.version,
          remoteVersion: remoteManifest.version,
          changedFileCount: diff.changed.length,
          deletedFileCount: diff.deleted.length,
          downloadBytes: diff.downloadBytes,
        });
        return pending;
      } catch (error) {
        logWarn('OTA check/download failed', error instanceof Error ? error.message : error);
        throw error;
      } finally {
        window.clearTimeout(timeout);
        activeDownload = null;
      }
    })();

    return activeDownload;
  },

  async prepareAtSplash(
    onProgress: (progress: OtaDownloadProgress) => void,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    const state = readState();
    if (state.activation) {
      if (state.activation.version === publicEnv.webBundleVersion) {
        logInfo(`Activated release reached splash: ${state.activation.version}`);
        return;
      }

      if (state.pending) state.failedReleaseId = state.pending.releaseId;
      logWarn('Activation did not reach expected web bundle version; clearing pending release', {
        expected: state.activation.version,
        current: publicEnv.webBundleVersion,
      });
      delete state.activation;
      delete state.pending;
      writeState(state);
      return;
    }

    let pending = this.getPending();
    if (pending) {
      try {
        await this.checkAndDownload(onProgress);
        pending = this.getPending();
      } catch (error) {
        logWarn('Pending update refresh skipped', error instanceof Error ? error.message : error);
      }
      if (pending) {
        onProgress({
          progress: 5,
          statusKey: 'ota.applying',
          detail: `Applying ${pending.version}`,
          remoteVersion: pending.version,
          changedFileCount: pending.changedFileCount,
          deletedFileCount: pending.deletedFileCount,
          downloadBytes: pending.size,
        });
      }
      await this.activatePending();
      return;
    }

    try {
      await this.checkAndDownload(onProgress);
    } catch (error) {
      onProgress({
        progress: 20,
        statusKey: 'ota.failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
