import { ApiError, NetworkUnavailableError, asolApi, ASOL_API_ROUTES } from '@/core/api';

export type NetworkHealthCheckResult = 'reachable' | 'unreachable';

export class NetworkApiService {
  async checkHealth(signal?: AbortSignal): Promise<NetworkHealthCheckResult> {
    try {
      const result = await asolApi.get<{ status: 'ok' }>(ASOL_API_ROUTES.health, {
        signal,
        cache: 'no-store',
        suppressErrorLog: true,
      });

      return result.status === 'ok' ? 'reachable' : 'unreachable';
    } catch (error) {
      // A valid HTTP response (including 404 from an older backend deployment)
      // proves that the server is reachable. Network failures have no status.
      if (error instanceof ApiError && error.status > 0) return 'reachable';
      if (error instanceof NetworkUnavailableError) return 'unreachable';
      throw error;
    }
  }
}

export const networkApiService = new NetworkApiService();
