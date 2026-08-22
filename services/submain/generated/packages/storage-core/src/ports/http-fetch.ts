/**
 * HTTP fetch port — rule 7 the other way.
 *
 * R2 platform calls must go through the application's designated HTTP gateway
 * (`asolHttpFetch`), which is the only module allowed to call `fetch` directly.
 * This package names the function it needs; the application registers it.
 *
 * Default is the global `fetch` so an unconfigured tooling path still works;
 * production wiring always replaces it with `asolHttpFetch`.
 */

export type StorageHttpFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

let httpFetch: StorageHttpFetch = (input, init) => fetch(input, init);

export function configureStorageCoreHttpFetch(next: StorageHttpFetch): void {
  httpFetch = next;
}

export function resetStorageCoreHttpFetch(): void {
  httpFetch = (input, init) => fetch(input, init);
}

export function asolHttpFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return httpFetch(input, init);
}
