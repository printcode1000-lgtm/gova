import { ApiError, NetworkOfflineError, NetworkUnavailableError } from './api-error';
import { buildAsolApiUrl, buildPublicAssetUrl } from './asol-api-config';
import { asolHttpFetch } from './asol-http-transport';
import { trackAsolApiRequest } from '@/core/monitor/asol-api-monitor';

export interface AsolApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  suppressErrorLog?: boolean;
}

/**
 * AsolApiClient — the single HTTP gateway between ASOL clients and the ASOL backend.
 */
export class AsolApiClient {
  private assertOnline(method: string, route: string, suppressErrorLog = false): void {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const error = new NetworkOfflineError();
      if (!suppressErrorLog) {
        console.error(`[AsolApiClient] ${method} ${route} failed: ${error.message}`);
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
      console.error(`[AsolApiClient] ${method} ${route} failed: ${message}`);
    }
    throw normalizedError;
  }

  private async request<T>(
    method: string,
    route: string,
    body?: unknown,
    options: AsolApiRequestOptions = {}
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
      return await trackAsolApiRequest(method, route, true, async () => {
        const response = await asolHttpFetch(buildAsolApiUrl(route), init);
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
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

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

    if (text && !contentType.includes('application/json')) {
      throw new ApiError(
        `Expected JSON response but received ${contentType || 'an unknown content type'}`,
        response.status,
      );
    }

    return data as T;
  }

  get<T>(route: string, options?: AsolApiRequestOptions): Promise<T> {
    return this.request<T>('GET', route, undefined, options);
  }

  post<T>(route: string, body: unknown, options?: AsolApiRequestOptions): Promise<T> {
    return this.request<T>('POST', route, body, options);
  }

  put<T>(route: string, body: unknown, options?: AsolApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', route, body, options);
  }

  patch<T>(route: string, body: unknown, options?: AsolApiRequestOptions): Promise<T> {
    return this.request<T>('PATCH', route, body, options);
  }

  delete<T>(route: string, options?: AsolApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', route, undefined, options);
  }

  /** POST multipart/form-data (e.g. file uploads). Does not set Content-Type — browser sets boundary. */
  postForm<T>(route: string, formData: FormData, options?: AsolApiRequestOptions): Promise<T> {
    return trackAsolApiRequest('POST', route, true, async () => {
      const response = await asolHttpFetch(buildAsolApiUrl(route), {
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
  async getPublicJson<T>(assetPath: string, options?: AsolApiRequestOptions): Promise<T> {
    return trackAsolApiRequest('GET', assetPath, false, async () => {
      const response = await asolHttpFetch(buildPublicAssetUrl(assetPath), {
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
  async getPublicBinary(assetPath: string, options?: AsolApiRequestOptions): Promise<ArrayBuffer> {
    return trackAsolApiRequest('GET', assetPath, false, async () => {
      const response = await asolHttpFetch(buildPublicAssetUrl(assetPath), {
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
  async getAbsoluteJson<T>(url: string, options: AsolApiRequestOptions = {}): Promise<T> {
    this.assertOnline('GET', url, options.suppressErrorLog);
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
    }

    try {
      return await trackAsolApiRequest('GET', url, false, async () => {
        const response = await asolHttpFetch(parsedUrl, {
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
  async getAbsoluteBinary(url: string, options: AsolApiRequestOptions = {}): Promise<ArrayBuffer> {
    this.assertOnline('GET', url, options.suppressErrorLog);
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
    }

    try {
      return await trackAsolApiRequest('GET', url, false, async () => {
        const response = await asolHttpFetch(parsedUrl, {
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

export const asolApi = new AsolApiClient();
