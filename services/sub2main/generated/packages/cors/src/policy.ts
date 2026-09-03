import { ANY_ORIGIN } from './origins';
import type { CorsPolicy, CorsPolicyInput } from './types';

/**
 * Every request header a browser client may send to any ASOL surface.
 *
 * This is not a per-surface fact. One client speaks to all of them, and a surface that advertises
 * fewer headers than the client can send does not "answer less": the preflight rejects the request
 * before it is sent, and the caller sees an unreachable server rather than a CORS error. That is
 * exactly how a narrower list on the profiles mirror surfaced — `Unable to reach the server`, with
 * no CORS wording anywhere to point at the cause.
 *
 * So the list is stated once. Widening it is safe: no surface accepts credentials, so a header a
 * surface ignores stays ignored.
 */
export const BROWSER_REQUEST_HEADERS: readonly string[] = [
  'Content-Type',
  'Authorization',
  'Accept',
  'X-Asol-Session-Token',
  'X-Asol-Trace-Id',
];

/**
 * Every method a browser client may use. Unlike the header list this *is* a per-surface fact — a
 * read-only deployment that advertises `POST` is describing a route it does not have — so a
 * surface narrows it deliberately. The full set is the default for a boundary that stands in front
 * of paths it does not enumerate.
 */
export const BROWSER_REQUEST_METHODS: readonly string[] = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];

/** One day. The preflight answer for a given path does not change more often than a deployment. */
export const PREFLIGHT_MAX_AGE_SECONDS = 86400;

/** Raised when a policy would hand a credentialed response to an origin it never verified. */
export const CREDENTIALS_WITH_UNVERIFIED_ORIGIN = 'corsCredentialsWithUnverifiedOrigin';

function normalizeList(values: readonly string[] | undefined): readonly string[] {
  if (!values) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

/**
 * Validates and completes a policy. The only way to obtain a `CorsPolicy`.
 *
 * The one invariant it enforces is the one the browser enforces anyway, but far too late to
 * diagnose: a credentialed cross-origin response may not be granted to `*`, and it may not be
 * granted to an origin that was echoed rather than checked. Both would let any site read a
 * signed-in response. Failing here, at policy construction, turns that into a startup error
 * instead of a silent security hole that only shows up as a console message in someone's browser.
 */
export function createCorsPolicy(input: CorsPolicyInput): CorsPolicy {
  const credentials = input.credentials ?? false;
  const origins = input.origins;

  if (credentials) {
    const unverified =
      origins.kind === 'wildcard' ||
      origins.kind === 'reflect' ||
      origins.origins.includes(ANY_ORIGIN);
    if (unverified) {
      throw new Error(CREDENTIALS_WITH_UNVERIFIED_ORIGIN);
    }
  }

  return {
    origins,
    methods: normalizeList(input.methods),
    headers: normalizeList(input.headers),
    exposeHeaders: normalizeList(input.exposeHeaders),
    credentials,
    maxAgeSeconds: input.maxAgeSeconds === undefined ? PREFLIGHT_MAX_AGE_SECONDS : input.maxAgeSeconds,
  };
}

/**
 * The same policy, answering a different method list.
 *
 * The main application's API boundary knows which methods each individual path is owned for, so
 * its preflight advertises that path's methods rather than the boundary's full set. Deriving a
 * policy keeps that narrowing inside the type instead of letting the caller assemble a second
 * header record by hand.
 */
export function withAllowedMethods(policy: CorsPolicy, methods: readonly string[]): CorsPolicy {
  return { ...policy, methods: normalizeList(methods) };
}
