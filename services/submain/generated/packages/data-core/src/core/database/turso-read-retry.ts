type TursoErrorShape = {
  code?: string;
  name?: string;
  message?: string;
  status?: number;
  statusCode?: number;
};

export interface TursoReadRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
}

export function isRetrySafeTursoRead(sql: string): boolean {
  const normalized = sql.trim();
  if (/^(?:SELECT|PRAGMA)\b/i.test(normalized)) return true;
  if (!/^WITH\b/i.test(normalized)) return false;
  // SQLite accepts WITH before mutations too. Retry only CTEs with no
  // mutating statement anywhere; a false negative costs resilience, while a
  // false positive could apply a write twice after a lost response.
  return !/\b(?:INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP)\b/i.test(normalized);
}

export function isRetryableTursoReadError(error: unknown): boolean {
  const value = error as TursoErrorShape;
  const status = value.statusCode ?? value.status;
  if (status === 408 || status === 429 || (status !== undefined && status >= 500)) return true;
  if (status === 400 || status === 401 || status === 403 || status === 404) return false;
  const description = [value.name, value.code, value.message].filter(Boolean).join(" ");
  const httpStatus = /HTTP status\s+(\d{3})/i.exec(description)?.[1];
  if (httpStatus) {
    const parsed = Number(httpStatus);
    return parsed === 408 || parsed === 429 || parsed >= 500;
  }
  return /\bSERVER_ERROR\b|ECONNABORTED|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|network error/i.test(
    description,
  );
}

export async function withTursoReadRetry<T>(
  action: () => Promise<T>,
  options: TursoReadRetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 120);
  const sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const random = options.random ?? Math.random;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isRetryableTursoReadError(error) || attempt === maxAttempts) throw error;
      const delayMs = baseDelayMs * 2 ** (attempt - 1) + Math.floor(random() * 80);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
