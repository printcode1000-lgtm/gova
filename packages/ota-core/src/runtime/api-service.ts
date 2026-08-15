import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import { NativeCore, isNativePlatform } from '@asol/native-core';

import type {
  OtaAdminDashboard,
  OtaIdentity,
  OtaManifest,
  OtaReleaseAccess,
  OtaReleaseDiff,
  SetOtaReleaseApprovalInput,
} from '../domain/release/manifest-types';

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
      const res = await NativeCore.getPreference(key);
      if (res.ok) value = res.value.value;
    } catch {
      // An unavailable preference store must not disable rollout eligibility.
    }
    if (!value) {
      value = crypto.randomUUID();
      try {
        await NativeCore.setPreference(key, value);
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
    if (isNativePlatform()) {
      if (signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      const res = await NativeCore.httpGetJson<T>({
        url,
        headers: { Accept: 'application/json' },
        connectTimeout: 15_000,
        readTimeout: 30_000,
      });
      if (!res.ok) {
        throw new Error(`OTA request failed: ${res.error.message}`);
      }
      return res.value;
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
    if (isNativePlatform()) {
      if (signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      const res = await NativeCore.httpGetBinary({
        url,
        headers: { Accept: 'application/octet-stream, */*' },
        connectTimeout: 15_000,
        readTimeout: 60_000,
      });
      if (!res.ok) {
        throw new Error(`OTA binary response is invalid: ${res.error.message}`);
      }
      return res.value;
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
