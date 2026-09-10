const RETRY_DELAYS_MS = [500, 1_250] as const;

function errorText(error: unknown, key: "name" | "message"): string {
  if (typeof error !== "object" || error === null) return "";
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function isTransientWebPushServiceError(error: unknown): boolean {
  return (
    errorText(error, "name") === "AbortError" &&
    /registration failed|push service error/i.test(errorText(error, "message"))
  );
}

export interface WebPushRetryOptions<T> {
  subscribe: () => Promise<T>;
  readExisting: () => Promise<T | null>;
  sleep?: (milliseconds: number) => Promise<void>;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

/**
 * Chromium can transiently reject PushManager.subscribe() while its Android
 * push-service registration is reconnecting. Re-checking getSubscription()
 * between attempts also covers the race where the browser created the
 * subscription but surfaced an AbortError before resolving the first call.
 */
export async function subscribeWithWebPushRetry<T>({
  subscribe,
  readExisting,
  sleep = defaultSleep,
}: WebPushRetryOptions<T>): Promise<T> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const existing = await readExisting();
    if (existing) return existing;

    try {
      return await subscribe();
    } catch (error) {
      if (
        !isTransientWebPushServiceError(error) ||
        attempt === RETRY_DELAYS_MS.length
      ) {
        throw error;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error("webPushRetryExhausted");
}
