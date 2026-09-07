/**
 * Fetch cancellation is expected when a newer health check supersedes an older one
 * or when the provider unmounts. It is not a network failure and must stay out of
 * persistent telemetry. Checking `name` also works across browser realms.
 */
export function isExpectedNetworkCheckAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
