/**
 * The vocabulary of one CORS decision.
 *
 * Every surface in this repository — the six service deployments, the control runtime, the main
 * application's API boundary, the Next.js header table, the local static preview — used to state
 * its own answer as a hand-written record of `Access-Control-*` strings. Five copies of the same
 * record drifted five different ways, and one of them (a narrower request-header list on the
 * profiles mirror) surfaced to users as an unreachable server. The record is now a value of this
 * type, produced in exactly one place.
 */

/**
 * How a policy decides which origin may read the response. The three kinds are the three answers
 * the repository actually gives; there is deliberately no fourth "reflect if it looks close
 * enough" mode, because a prefix or suffix comparison is how origin checks get bypassed.
 */
export type CorsOriginPolicy =
  /** Always `*`. For a surface that serves public bytes and accepts no credentials. */
  | { readonly kind: 'wildcard' }
  /**
   * Echo the request's own origin, `*` when it sends none.
   *
   * Safe only because no ASOL surface accepts credentials: the cross-origin contract is an
   * explicit signed header, never a cookie, so a permissive origin cannot be used to ride on
   * someone's session. `createCorsPolicy` refuses to combine this with credentials.
   */
  | { readonly kind: 'reflect' }
  /**
   * Allow only an exact member of `origins`. A `*` entry means the list itself is a wildcard —
   * that is the shape `ASOL_CORS_ORIGINS=*` has always had. Comparison is exact and never by
   * prefix, so `https://app.example.evil.tld` is not `https://app.example`.
   */
  | { readonly kind: 'list'; readonly origins: readonly string[] };

/** What a caller declares. Everything but the origin rule has a repository-wide default. */
export interface CorsPolicyInput {
  readonly origins: CorsOriginPolicy;
  /** Methods a browser may use. Omit for a surface that answers no preflight. */
  readonly methods?: readonly string[];
  /** Request headers a browser may send. Usually `BROWSER_REQUEST_HEADERS`. */
  readonly headers?: readonly string[];
  /** Response headers a browser may read. Empty means the CORS-safelisted set only. */
  readonly exposeHeaders?: readonly string[];
  /**
   * Whether the browser may send credentials. `false` everywhere in this repository, and the
   * reason every surface above may echo an origin at all.
   */
  readonly credentials?: boolean;
  /** Preflight cache lifetime. `null` omits the header entirely. */
  readonly maxAgeSeconds?: number | null;
}

/** A validated, fully-resolved policy. Only `createCorsPolicy` produces one. */
export interface CorsPolicy {
  readonly origins: CorsOriginPolicy;
  readonly methods: readonly string[];
  readonly headers: readonly string[];
  readonly exposeHeaders: readonly string[];
  readonly credentials: boolean;
  readonly maxAgeSeconds: number | null;
}

/**
 * The part of a `Request` a CORS decision reads: one header.
 *
 * Typed structurally rather than as `Request` so this package stays framework-free and runtime-free
 * — a `NextRequest`, a `Request`, and a test double all satisfy it, and nothing here needs the
 * body, the URL, or the method.
 */
export interface CorsRequestLike {
  readonly headers: { get(name: string): string | null };
}
