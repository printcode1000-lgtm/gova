/**
 * @asol/service-runtime-core — what every service deployment does identically.
 *
 * The six mirrors are separate Next.js projects that share no application code by design. What
 * they *were* sharing was five hand-copied HTTP helper files and six hand-copied health routes,
 * each drifting from the main application's behaviour in its own direction. This package holds
 * the mechanism; each deployment keeps its own policy — which methods it answers, which error
 * codes it can produce, which shards it needs.
 *
 * Dependency-free and framework-free: `Request` and `Response` only, so it runs in every runtime
 * a deployment might be built for.
 */
export type { CorsPolicy } from './domain/cors';
export { BROWSER_REQUEST_HEADERS, corsHeadersFor, preflightFor, withCorsFor } from './domain/cors';

export type { ErrorStatusRule } from './domain/error-status';
export { INTERNAL_SERVER_ERROR, errorMessageOf, mapErrorStatus } from './domain/error-status';

export type { ServiceHttp, ServiceHttpOptions } from './domain/service-http';
export { createServiceHttp } from './domain/service-http';

export type { ServiceProxyOptions } from './domain/service-proxy';
export { createServiceProxy } from './domain/service-proxy';

export type {
  HealthReport,
  CredentialHealthOptions,
  ShardHealthOptions,
  ShardHealthReport,
} from './domain/health';
export {
  credentialHealthReport,
  credentialHealthResponse,
  shardHealthReport,
  shardHealthResponse,
} from './domain/health';
