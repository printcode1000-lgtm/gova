import { ApiError, govaApi, GOVA_API_ROUTES } from '@/core/api';

export class NetworkApiService {
  async checkHealth(signal?: AbortSignal): Promise<boolean> {
    try {
      const result = await govaApi.get<{ status: 'ok' }>(GOVA_API_ROUTES.health, {
        signal,
        cache: 'no-store',
        suppressErrorLog: true,
      });

      return result.status === 'ok';
    } catch (error) {
      // A valid HTTP response (including 404 from an older backend deployment)
      // proves that the server is reachable. Network failures have no status.
      if (error instanceof ApiError && error.status > 0) return true;
      throw error;
    }
  }
}

export const networkApiService = new NetworkApiService();
