import { createCorsPolicy, reflectRequestOrigin } from '@asol/cors';
import { createServiceHttp } from '@asol/service-runtime-core';
import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

/**
 * The HTTP policy of this account's account-facing notification routes.
 *
 * `/api/notifications/send` keeps its own narrower policy: a grant travels in
 * the body and no credential is ever accepted there. These routes authorise
 * with the signed session header instead, so they share the mechanism every
 * other account uses — `@asol/service-runtime-core` — and the application's own
 * status mapping, so a client cannot tell which origin answered.
 */
const http = createServiceHttp({
  cors: createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Accept', 'X-Asol-Trace-Id'],
  }),
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const jsonResponse = http.jsonResponse;
export const readJsonBody = http.readJsonBody;

/**
 * The shared application status mapping. An unmapped failure is a server fault;
 * the client is told nothing, and it is logged because a swallowed 500 is
 * invisible. See docs/08-troubleshooting/problems/owned-route-not-shipped.md.
 */
export function businessErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'internalServerError';
  const mapped = businessApiErrorStatus(message);
  if (mapped.status >= 500) {
    console.error(
      `[${new URL(request.url).pathname}] unmapped failure:`,
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
  }
  return http.jsonResponse(request, { error: mapped.code }, mapped.status);
}
