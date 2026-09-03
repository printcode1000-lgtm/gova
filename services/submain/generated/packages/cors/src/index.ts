/**
 * @asol/cors — the single source of truth for CORS behaviour in this repository.
 *
 * Every surface that answers a browser cross-origin gets its headers from here: the six service
 * deployments (through `@asol/service-runtime-core`), the control runtime, the main application's
 * API boundary, the Next.js header table, the notification send endpoints, and the object-storage
 * bucket policies that share the same allowed-origin configuration. No other file in the
 * repository may write an `Access-Control-*` header; `npm run architecture:check` enforces it.
 *
 * Dependency-free and framework-free. It is built into six separate Vercel uploads, so a
 * dependency here is a dependency in six deployments, and it must run in every runtime one of
 * them might be built for. It depends on nothing in this repository either — not on
 * `service-runtime-core`, not on the application, not on any service — so the dependency direction
 * is one-way and no cycle is possible.
 *
 * Contract: docs/05-platform-features/sealed-packages/cors-module.md
 */
export type { CorsOriginPolicy, CorsPolicy, CorsPolicyInput, CorsRequestLike } from './types';

export {
  ANY_ORIGIN,
  DEVELOPMENT_ORIGINS,
  allowOrigins,
  allowsAnyOrigin,
  anyOrigin,
  isOriginAllowed,
  parseAllowedOrigins,
  reflectRequestOrigin,
} from './origins';

export type { CorsEnvironment } from './env';
export { CORS_ORIGINS_ENV_KEY, corsOriginsFromEnv } from './env';

export {
  BROWSER_REQUEST_HEADERS,
  BROWSER_REQUEST_METHODS,
  CREDENTIALS_WITH_UNVERIFIED_ORIGIN,
  PREFLIGHT_MAX_AGE_SECONDS,
  createCorsPolicy,
  withAllowedMethods,
} from './policy';

export { requestOrigin, resolveCorsHeaders } from './headers';

export { PREFLIGHT_STATUS, handleCorsPreflight, isCorsPreflight } from './preflight';

export type { SetCorsHeadersOptions } from './apply';
export { setCorsHeaders, withCorsHeaders } from './apply';
