import { ApiError, NetworkOfflineError, NetworkUnavailableError } from './api-error';
import { buildGovaApiUrl, buildPublicAssetUrl } from './gova-api-config';
import { govaHttpFetch } from './gova-http-transport';
import { trackGovaApiRequest } from '@/core/monitor/gova-api-monitor';

export interface GovaApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  suppressErrorLog?: boolean;
}

/**
 * GovaApiClient — the single HTTP gateway between GOVA clients and the GOVA backend.
 */
export class GovaApiClient {
  private assertOnline(method: string, route: string, suppressErrorLog = false): void {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const error = new NetworkOfflineError();
      if (!suppressErrorLog) {
        console.error(`[GovaApiClient] ${method} ${route} failed: ${error.message}`);
      }
      throw error;
    }
  }

  private normalizeNetworkError(error: unknown): unknown {
    if (error instanceof DOMException && error.name === 'AbortError') return error;
    return error instanceof TypeError ? new NetworkUnavailableError() : error;
  }

  private logAndThrow(method: string, route: string, error: unknown, suppressErrorLog = false): never {
    const normalizedError = this.normalizeNetworkError(error);
    const message =
      normalizedError instanceof Error ? normalizedError.message : String(normalizedError);
    if (!suppressErrorLog) {
      console.error(`[GovaApiClient] ${method} ${route} failed: ${message}`);
    }
    throw normalizedError;
  }

  private async request<T>(
    method: string,
    route: string,
    body?: unknown,
    options: GovaApiRequestOptions = {}
  ): Promise<T> {
    this.assertOnline(method, route, options.suppressErrorLog);

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

    try {
      return await trackGovaApiRequest(method, route, true, async () => {
        const response = await govaHttpFetch(buildGovaApiUrl(route), init);
        const data = await this.parseResponse<T>(response);
        return { data, response };
      });
    } catch (error) {
      this.logAndThrow(method, route, error, options.suppressErrorLog);
    }
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

  /** POST multipart/form-data (e.g. file uploads). Does not set Content-Type — browser sets boundary. */
  postForm<T>(route: string, formData: FormData, options?: GovaApiRequestOptions): Promise<T> {
    return trackGovaApiRequest('POST', route, true, async () => {
      const response = await govaHttpFetch(buildGovaApiUrl(route), {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json', ...options?.headers },
        credentials: 'omit',
        signal: options?.signal,
        cache: options?.cache,
      });
      const data = await this.parseResponse<T>(response);
      return { data, response };
    });
  }

  /** Load a static JSON file from the public folder (not a Business API call). */
  async getPublicJson<T>(assetPath: string, options?: GovaApiRequestOptions): Promise<T> {
    return trackGovaApiRequest('GET', assetPath, false, async () => {
      const response = await govaHttpFetch(buildPublicAssetUrl(assetPath), {
        method: 'GET',
        headers: { Accept: 'application/json', ...options?.headers },
        credentials: 'omit',
        signal: options?.signal,
        cache: options?.cache ?? 'no-store',
      });
      const data = await this.parseResponse<T>(response);
      return { data, response };
    });
  }

  /** Load a static binary file from the currently served public app assets. */
  async getPublicBinary(assetPath: string, options?: GovaApiRequestOptions): Promise<ArrayBuffer> {
    return trackGovaApiRequest('GET', assetPath, false, async () => {
      const response = await govaHttpFetch(buildPublicAssetUrl(assetPath), {
        method: 'GET',
        headers: { Accept: 'application/octet-stream, */*', ...options?.headers },
        credentials: 'omit',
        signal: options?.signal,
        cache: options?.cache ?? 'no-store',
      });
      if (!response.ok) await this.parseResponse<never>(response);
      return { data: await response.arrayBuffer(), response };
    });
  }

  /** Load JSON from an explicit HTTP(S) URL (for signed platform manifests). */
  async getAbsoluteJson<T>(url: string, options: GovaApiRequestOptions = {}): Promise<T> {
    this.assertOnline('GET', url, options.suppressErrorLog);
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
    }

    try {
      return await trackGovaApiRequest('GET', url, false, async () => {
        const response = await govaHttpFetch(parsedUrl, {
          method: 'GET',
          headers: { Accept: 'application/json', ...options.headers },
          credentials: 'omit',
          signal: options.signal,
          cache: options.cache ?? 'no-store',
        });
        const data = await this.parseResponse<T>(response);
        return { data, response };
      });
    } catch (error) {
      this.logAndThrow('GET', url, error, options.suppressErrorLog);
    }
  }

  /** Load binary data from an explicit HTTP(S) URL through the HTTP gateway. */
  async getAbsoluteBinary(url: string, options: GovaApiRequestOptions = {}): Promise<ArrayBuffer> {
    this.assertOnline('GET', url, options.suppressErrorLog);
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
    }

    try {
      return await trackGovaApiRequest('GET', url, false, async () => {
        const response = await govaHttpFetch(parsedUrl, {
          method: 'GET',
          headers: { Accept: 'application/zip, application/octet-stream', ...options.headers },
          credentials: 'omit',
          signal: options.signal,
          cache: options.cache ?? 'no-store',
        });
        if (!response.ok) await this.parseResponse<never>(response);
        return { data: await response.arrayBuffer(), response };
      });
    } catch (error) {
      this.logAndThrow('GET', url, error, options.suppressErrorLog);
    }
  }
}

export const govaApi = new GovaApiClient();
