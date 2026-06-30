import { govaApi } from '@/core/api';

import type { OtaManifest } from '../types/ota.types';

export class OtaApiService {
  getLocalManifest(signal?: AbortSignal): Promise<OtaManifest> {
    return govaApi.getPublicJson<OtaManifest>('/gova-web-manifest.json', {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  getManifest(url: string, signal?: AbortSignal): Promise<OtaManifest> {
    return govaApi.getAbsoluteJson<OtaManifest>(url, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  getFile(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
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
