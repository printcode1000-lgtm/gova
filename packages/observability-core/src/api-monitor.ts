import { isObservabilityEnabled } from './ports';

export type TrackedApiResult<T> = T | { data: T; response: Response };

function hasResponse<T>(value: TrackedApiResult<T>): value is { data: T; response: Response } {
  return typeof value === 'object' && value !== null && 'response' in value && 'data' in value;
}

function unwrapTrackedResult<T>(value: TrackedApiResult<T>): T {
  if (hasResponse(value)) return value.data;
  return value;
}

/**
 * Load-safe HTTP observability seam used by the shared API client.
 *
 * Server / React Server runtimes execute the request directly and never load the
 * browser monitor store (and therefore never load @asol/data-core/browser or
 * TanStack Query). Development browsers lazily enter the full monitor graph.
 */
export async function trackAsolApiRequest<T>(
  method: string,
  route: string,
  isBusinessApi: boolean,
  request: () => Promise<TrackedApiResult<T>>,
): Promise<T> {
  if (typeof window === 'undefined' || !isObservabilityEnabled()) {
    return unwrapTrackedResult(await request());
  }

  const browserMonitor = await import('./monitor/asol-api-monitor');
  return browserMonitor.trackAsolApiRequest(method, route, isBusinessApi, request);
}
