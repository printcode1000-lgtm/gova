import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { nativePlatform } from '@/native-platform';

import type {
  OtaAdminDashboard,
  OtaIdentity,
  OtaManifest,
  OtaReleaseAccess,
  OtaReleaseDiff,
  SetOtaReleaseApprovalInput,
} from '../types/ota.types';

function assertSuccessfulResponse(status: number, url: string): void {
  if (status < 200 || status >= 300) {
    throw new Error(`OTA request failed (${status}): ${url}`);
  }
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export class OtaApiService {
  private cachedInstallationId: string | null = null;

  /**
   * Staged rollout excludes any installation that reports no id, so this must
   * never return empty and must never change within a session: a fresh id each
   * call would move the device between buckets and flap its eligibility.
   * Preference failures therefore degrade to a session-stable id rather than
   * to nothing.
   */
  private async rolloutInstallationId(): Promise<string> {
    if (this.cachedInstallationId) return this.cachedInstallationId;
    const key = 'asol-ota-rollout-installation-id';
    let value: string | null = null;
    try {
      value = (await nativePlatform.preferences.get(key)).value;
    } catch {
      // An unavailable preference store must not disable rollout eligibility.
    }
    if (!value) {
      value = crypto.randomUUID();
      try {
        await nativePlatform.preferences.set(key, value);
      } catch {
        // Persisting failed; the in-memory id still keeps this session stable.
      }
    }
    this.cachedInstallationId = value;
    return value;
  }
  getLocalManifest(signal?: AbortSignal): Promise<OtaManifest> {
    return asolApi.getPublicJson<OtaManifest>('/asol-web-manifest.json', {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  private async getRemoteJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    if (Capacitor.isNativePlatform()) {
      if (signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      const response = await CapacitorHttp.get({
        url,
        headers: { Accept: 'application/json' },
        responseType: 'json',
        connectTimeout: 15_000,
        readTimeout: 30_000,
      });
      assertSuccessfulResponse(response.status, url);
      return (typeof response.data === 'string' ? JSON.parse(response.data) : response.data) as T;
    }

    return asolApi.getAbsoluteJson<T>(url, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  getManifest(url: string, signal?: AbortSignal): Promise<OtaManifest> {
    return this.getRemoteJson<OtaManifest>(url, signal);
  }

  getRevocationDocument(url: string, signal?: AbortSignal): Promise<unknown> {
    return this.getRemoteJson<unknown>(url, signal);
  }

  async getFile(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    if (Capacitor.isNativePlatform()) {
      if (signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      const response = await CapacitorHttp.get({
        url,
        headers: { Accept: 'application/octet-stream, */*' },
        responseType: 'arraybuffer',
        connectTimeout: 15_000,
        readTimeout: 60_000,
      });
      assertSuccessfulResponse(response.status, url);
      if (typeof response.data !== 'string') {
        throw new Error(`OTA binary response is invalid: ${url}`);
      }
      return decodeBase64(response.data);
    }

    return asolApi.getAbsoluteBinary(url, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  getCurrentFile(path: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    return asolApi.getPublicBinary(`/${path}`, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  async getReleaseAccess(input: {
    releaseId: string;
    version: string;
    identity?: OtaIdentity;
  }, signal?: AbortSignal): Promise<OtaReleaseAccess> {
    return asolApi.post<OtaReleaseAccess>(ASOL_API_ROUTES.ota.access, {
      ...input,
      installationId: await this.rolloutInstallationId(),
    }, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  getAdminDashboard(identity: OtaIdentity): Promise<OtaAdminDashboard> {
    const query = new URLSearchParams({ uid: identity.uid, phone: identity.phone });
    return asolApi.get<OtaAdminDashboard>(`${ASOL_API_ROUTES.ota.adminReleases}?${query}`, {
      cache: 'no-store',
    });
  }

  getReleaseDiff(identity: OtaIdentity, baseReleaseId: string): Promise<OtaReleaseDiff> {
    const query = new URLSearchParams({
      uid: identity.uid,
      phone: identity.phone,
      baseReleaseId,
    });
    return asolApi.get<OtaReleaseDiff>(`${ASOL_API_ROUTES.ota.adminReleaseDiff}?${query}`, {
      cache: 'no-store',
    });
  }

  setReleaseApproval(input: SetOtaReleaseApprovalInput): Promise<OtaAdminDashboard> {
    return asolApi.put<OtaAdminDashboard>(ASOL_API_ROUTES.ota.adminReleases, input, {
      cache: 'no-store',
    });
  }
}

export const otaApiService = new OtaApiService();
