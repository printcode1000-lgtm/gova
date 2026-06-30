import { govaApi } from '@/core/api';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

import type { OtaManifest } from '../types/ota.types';

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
  getLocalManifest(signal?: AbortSignal): Promise<OtaManifest> {
    return govaApi.getPublicJson<OtaManifest>('/gova-web-manifest.json', {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  async getManifest(url: string, signal?: AbortSignal): Promise<OtaManifest> {
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
      return (typeof response.data === 'string' ? JSON.parse(response.data) : response.data) as OtaManifest;
    }

    return govaApi.getAbsoluteJson<OtaManifest>(url, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
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

    return govaApi.getAbsoluteBinary(url, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  getCurrentFile(path: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    return govaApi.getPublicBinary(`/${path}`, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }
}

export const otaApiService = new OtaApiService();
