import { corsHeadersFor, preflightFor, withCorsFor, type CorsPolicy } from './cors';
import { errorMessageOf, mapErrorStatus, type ErrorStatusRule } from './error-status';

/**
 * One service deployment's HTTP surface: its CORS policy, plus a way to turn a thrown error into
 * the same response the main application would have produced.
 *
 * A deployment builds this once in `src/app/lib/http.ts` and its routes use it. The main app's
 * `apiSuccess` / `mapServiceError` still cannot be reused there — they reach into request tracing
 * and system logging, which would pull most of the application's module graph into a deployment
 * that only reads. What is shared now is the part that carried no such weight and had drifted
 * anyway: header construction, the message fallback, and the order rules are applied in.
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

export interface ServiceHttpOptions extends CorsPolicy {
  /** Applied when a route passes no rules of its own. */
  defaultRules?: readonly ErrorStatusRule[];
}

export function createServiceHttp(options: ServiceHttpOptions): ServiceHttp {
  const policy: CorsPolicy = { methods: options.methods, headers: options.headers };
  const defaults = options.defaultRules ?? [];

  return {
    corsHeaders: (request) => corsHeadersFor(request, policy),
    preflight: (request) => preflightFor(request, policy),
    withCors: (request, response) => withCorsFor(request, response, policy),
    errorResponse(request, error, rules = defaults) {
      const message = errorMessageOf(error);
      return Response.json(
        { error: message },
        { status: mapErrorStatus(message, rules), headers: corsHeadersFor(request, policy) },
      );
    },
    jsonResponse(request, data, status = 200) {
      return Response.json(data, { status, headers: corsHeadersFor(request, policy) });
    },
  };
}
