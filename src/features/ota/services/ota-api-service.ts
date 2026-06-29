import { govaApi } from '@/core/api';

import type { OtaManifest } from '../types/ota.types';

export class OtaApiService {
  getManifest(url: string, signal?: AbortSignal): Promise<OtaManifest> {
    return govaApi.getAbsoluteJson<OtaManifest>(url, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }

  getBundle(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    return govaApi.getAbsoluteBinary(url, {
      signal,
      cache: 'no-store',
      suppressErrorLog: true,
    });
  }
}

export const otaApiService = new OtaApiService();
