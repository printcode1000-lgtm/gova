import {
  handleCorsPreflight,
  resolveCorsHeaders,
  withCorsHeaders,
  type CorsPolicy,
} from '@asol/cors';

import { errorMessageOf, mapErrorStatus, type ErrorStatusRule } from './error-status';

/**
 * One service deployment's HTTP surface: its CORS policy, plus a way to turn a thrown error into
 * the same response the main application would have produced.
 *
 * A deployment builds this once in `src/app/lib/http.ts` and its routes use it. The main app's
 * `apiSuccess` / `mapServiceError` still cannot be reused there — they reach into request tracing
 * and system logging, which would pull most of the application's module graph into a deployment
 * that only reads. What is shared now is the part that carried no such weight and had drifted
 * anyway: the message fallback and the order rules are applied in.
 *
 * CORS itself is not implemented here at all. The deployment states a `CorsPolicy` from
 * `@asol/cors` and this file passes it through, so a mirror cannot answer a different envelope
 * than the application does.
 */
export interface ServiceHttp {
  corsHeaders(request: Request): Record<string, string>;
  preflight(request: Request): Response;
  withCors(request: Request, response: Response): Response;
  /** JSON error body with this deployment's CORS headers and the mapped status. */
  errorResponse(request: Request, error: unknown, rules?: readonly ErrorStatusRule[]): Response;
  /** JSON success body with this deployment's CORS headers. */
  jsonResponse(request: Request, data: unknown, status?: number): Response;
}

export interface ServiceHttpOptions {
  /** This deployment's CORS policy, built with `createCorsPolicy` from `@asol/cors`. */
  cors: CorsPolicy;
  /** Applied when a route passes no rules of its own. */
  defaultRules?: readonly ErrorStatusRule[];
}

export function createServiceHttp(options: ServiceHttpOptions): ServiceHttp {
  const policy = options.cors;
  const defaults = options.defaultRules ?? [];

  return {
    corsHeaders: (request) => resolveCorsHeaders(policy, request),
    preflight: (request) => handleCorsPreflight(policy, request),
    withCors: (request, response) => withCorsHeaders(response, policy, request),
    errorResponse(request, error, rules = defaults) {
      const message = errorMessageOf(error);
      return Response.json(
        { error: message },
        { status: mapErrorStatus(message, rules), headers: resolveCorsHeaders(policy, request) },
      );
    },
    jsonResponse(request, data, status = 200) {
      return Response.json(data, { status, headers: resolveCorsHeaders(policy, request) });
    },
  };
}
