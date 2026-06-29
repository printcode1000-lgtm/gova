import { publicEnv } from '@/core/config/public-env';
import { capacitorOtaAdapter } from '@/platform/ota/capacitor-ota-adapter';

import { otaApiService } from './ota-api-service';
import type {
  DownloadedOtaUpdate,
  OtaDownloadProgress,
  OtaManifest,
  OtaManifestPayload,
  OtaStoredState,
} from '../types/ota.types';

const OTA_STATE_KEY = 'gova-ota-state-v1';
export const OTA_STATE_EVENT = 'gova:ota-state';
const MAX_BUNDLE_BYTES = 50 * 1024 * 1024;

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

function canonicalPayload(payload: OtaManifestPayload): string {
  return JSON.stringify({
    schemaVersion: payload.schemaVersion,
    releaseId: payload.releaseId,
    version: payload.version,
    createdAt: payload.createdAt,
    bundleUrl: payload.bundleUrl,
    size: payload.size,
    sha256: payload.sha256,
    minimumNativeVersion: payload.minimumNativeVersion,
    mandatory: payload.mandatory,
    notes: payload.notes,
  });
}

function manifestPayload(manifest: OtaManifest): OtaManifestPayload {
  return {
    schemaVersion: manifest.schemaVersion,
    releaseId: manifest.releaseId,
    version: manifest.version,
    createdAt: manifest.createdAt,
    bundleUrl: manifest.bundleUrl,
    size: manifest.size,
    sha256: manifest.sha256,
    minimumNativeVersion: manifest.minimumNativeVersion,
    mandatory: manifest.mandatory,
    notes: manifest.notes,
  };
}

function validateManifest(manifest: OtaManifest): void {
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported OTA manifest schema');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error('Invalid OTA version');
  }
  if (!manifest.releaseId || !manifest.bundleUrl.startsWith('https://')) {
    throw new Error('Invalid OTA release metadata');
  }
  if (!Number.isSafeInteger(manifest.size) || manifest.size <= 0 || manifest.size > MAX_BUNDLE_BYTES) {
    throw new Error('OTA bundle size is invalid or exceeds 50 MB');
  }
  if (!/^[a-f0-9]{64}$/i.test(manifest.sha256) || !manifest.signature) {
    throw new Error('OTA integrity metadata is invalid');
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
    decodeBase64(manifest.signature),
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

let activeDownload: Promise<DownloadedOtaUpdate | null> | null = null;

export const otaUpdateService = {
  isEnabled(): boolean {
    return Boolean(
      publicEnv.otaManifestUrl &&
      publicEnv.otaPublicKey &&
      capacitorOtaAdapter.isAvailable(),
    );
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
    return state.pending;
  },

  async confirmRunningBundle(): Promise<void> {
    const state = readState();
    if (state.activation?.version !== publicEnv.webBundleVersion) return;
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
    await capacitorOtaAdapter.activate(state.pending.path);
  },

  async checkAndDownload(
    onProgress?: (progress: OtaDownloadProgress) => void,
  ): Promise<DownloadedOtaUpdate | null> {
    if (!this.isEnabled()) return null;
    const existing = this.getPending();
    if (existing) return existing;
    if (activeDownload) return activeDownload;

    activeDownload = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30_000);
      try {
        onProgress?.({ progress: 10, statusKey: 'ota.checking' });
        const manifest = await otaApiService.getManifest(publicEnv.otaManifestUrl, controller.signal);
        validateManifest(manifest);
        if (!(await verifyManifest(manifest))) throw new Error('OTA manifest signature is invalid');
        if (compareVersions(manifest.minimumNativeVersion, publicEnv.nativeVersion) > 0) return null;
        if (compareVersions(manifest.version, publicEnv.webBundleVersion) <= 0) return null;

        onProgress?.({ progress: 25, statusKey: 'ota.downloading' });
        const archive = await otaApiService.getBundle(manifest.bundleUrl, controller.signal);
        if (archive.byteLength !== manifest.size) throw new Error('OTA bundle size mismatch');

        onProgress?.({ progress: 55, statusKey: 'ota.verifying' });
        const digest = encodeHex(await crypto.subtle.digest('SHA-256', archive));
        if (digest.toLowerCase() !== manifest.sha256.toLowerCase()) {
          throw new Error('OTA bundle checksum mismatch');
        }

        onProgress?.({ progress: 65, statusKey: 'ota.installing' });
        const path = await capacitorOtaAdapter.install(manifest.version, archive);
        const pending: DownloadedOtaUpdate = {
          version: manifest.version,
          releaseId: manifest.releaseId,
          path,
          size: manifest.size,
          notes: manifest.notes,
          downloadedAt: Date.now(),
        };
        writeState({ ...readState(), pending });
        onProgress?.({ progress: 70, statusKey: 'ota.downloaded' });
        return pending;
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
    await this.confirmRunningBundle();

    const pending = this.getPending();
    if (pending) {
      onProgress({ progress: 5, statusKey: 'ota.applying' });
      await this.activatePending();
      return;
    }

    try {
      await this.checkAndDownload(onProgress);
    } catch (error) {
      console.warn('[GovaOTA] Update check skipped:', error instanceof Error ? error.message : error);
    }
  },
};
