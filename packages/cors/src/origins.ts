import type { CorsOriginPolicy } from './types';

/** The one spelling of "any origin", in a policy list and in an R2 bucket rule alike. */
export const ANY_ORIGIN = '*';

/**
 * The origins a browser speaks from when no allow-list is configured.
 *
 * Three of the six are not web pages at all: a Capacitor WebView reports `capacitor://localhost`
 * on iOS and `https://localhost` on Android, and an Ionic shell reports `ionic://localhost`. A
 * development default that lists only `http://localhost:3001` therefore locks out every native
 * build on the developer's own machine.
 *
 * This is a *development* default and nothing else. Production surfaces state their origins
 * explicitly through `ASOL_CORS_ORIGINS`; see `corsOriginsFromEnv`.
 */
export const DEVELOPMENT_ORIGINS: readonly string[] = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'ionic://localhost',
];

/**
 * Parses a comma-separated origin list.
 *
 * Empty entries are dropped rather than kept as `''`, because an empty allow-list entry would
 * otherwise match a request that sends no origin at all and turn a trailing comma into a hole.
 */
export function parseAllowedOrigins(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Whether the list is itself a wildcard — a `*` entry anywhere in it. */
export function allowsAnyOrigin(allowed: readonly string[]): boolean {
  return allowed.includes(ANY_ORIGIN);
}

/**
 * Exact membership, never a prefix or suffix comparison.
 *
 * `https://app.example.evil.tld` starts with an allowed `https://app.example` and ends with an
 * attacker-controlled host; a `startsWith`/`endsWith` check hands the response to it. Exact
 * equality is the only comparison this package performs.
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowed: readonly string[],
): boolean {
  if (allowsAnyOrigin(allowed)) return true;
  if (!origin) return false;
  return allowed.includes(origin);
}

/** Always answer `*`. For public bytes with no credentials. */
export function anyOrigin(): CorsOriginPolicy {
  return { kind: 'wildcard' };
}

/** Echo the caller's origin. Only valid without credentials — see `createCorsPolicy`. */
export function reflectRequestOrigin(): CorsOriginPolicy {
  return { kind: 'reflect' };
}

/** Allow exactly these origins. A `*` entry makes the list a wildcard. */
export function allowOrigins(origins: readonly string[]): CorsOriginPolicy {
  return { kind: 'list', origins: [...origins] };
}
