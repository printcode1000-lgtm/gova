export interface OtaHttpOptions {
  url: string;
  headers?: Record<string, string>;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
  connectTimeout?: number;
  readTimeout?: number;
  signal?: AbortSignal;
}
