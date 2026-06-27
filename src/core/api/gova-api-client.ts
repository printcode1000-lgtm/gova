import { ApiError } from './api-error';
import { buildGovaApiUrl, buildPublicAssetUrl } from './gova-api-config';
import { govaHttpFetch } from './gova-http-transport';

export interface GovaApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
}

/**
 * GovaApiClient — the single HTTP gateway between GOVA clients and the GOVA backend.
 */
export class GovaApiClient {
  private async request<T>(
    method: string,
    route: string,
    body?: unknown,
    options: GovaApiRequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    const init: RequestInit = {
      method,
      headers,
      credentials: 'omit',
      signal: options.signal,
      cache: options.cache,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await govaHttpFetch(buildGovaApiUrl(route), init);
    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `Request failed (${response.status})`;
      throw new ApiError(message, response.status);
    }

    return data as T;
  }

  get<T>(route: string, options?: GovaApiRequestOptions): Promise<T> {
    return this.request<T>('GET', route, undefined, options);
  }

  post<T>(route: string, body: unknown, options?: GovaApiRequestOptions): Promise<T> {
    return this.request<T>('POST', route, body, options);
  }

  put<T>(route: string, body: unknown, options?: GovaApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', route, body, options);
  }

  patch<T>(route: string, body: unknown, options?: GovaApiRequestOptions): Promise<T> {
    return this.request<T>('PATCH', route, body, options);
  }

  delete<T>(route: string, options?: GovaApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', route, undefined, options);
  }

  /** Load a static JSON file from the public folder (not a Business API call). */
  async getPublicJson<T>(assetPath: string, options?: GovaApiRequestOptions): Promise<T> {
    const response = await govaHttpFetch(buildPublicAssetUrl(assetPath), {
      method: 'GET',
      headers: { Accept: 'application/json', ...options?.headers },
      credentials: 'omit',
      signal: options?.signal,
      cache: options?.cache ?? 'no-store',
    });
    return this.parseResponse<T>(response);
  }
}

export const govaApi = new GovaApiClient();
