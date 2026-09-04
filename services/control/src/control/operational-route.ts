import 'server-only';

import {
  BROWSER_REQUEST_HEADERS,
  BROWSER_REQUEST_METHODS,
  createCorsPolicy,
  handleCorsPreflight,
  reflectRequestOrigin,
  resolveCorsHeaders,
  withCorsHeaders,
} from '@asol/cors';

import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

/**
 * Control answers a browser, not only a machine.
 *
 * These routes were written for the deploy callback and for GitHub, so they
 * carried no CORS headers at all and every preflight got a bare `204`. The
 * Super Admin console is a browser client on a different origin: without an
 * allow-origin header on the preflight the browser refuses to send
 * the request, and the console reports `Unable to reach the server` for a
 * runtime that is up and answering. Every Super Admin surface was unreachable
 * that way — user search, System Logs, OTA administration, build jobs.
 *
 * The policy is this runtime's own; the envelope is `@asol/cors`, shared with the
 * six workloads, so no origin can answer a narrower request-header list than the
 * client sends.
 */
const CONTROL_CORS = createCorsPolicy({
  origins: reflectRequestOrigin(),
  methods: BROWSER_REQUEST_METHODS,
  headers: BROWSER_REQUEST_HEADERS,
});

export function controlCorsHeaders(request: Request): Record<string, string> {
  return resolveCorsHeaders(CONTROL_CORS, request);
}

/** The preflight every control route answers. */
export function controlPreflight(request: Request): Response {
  return handleCorsPreflight(CONTROL_CORS, request);
}

/**
 * Every control response carries CORS, including the ones a handler builds itself.
 *
 * The Super Admin console is a browser client on another origin. A response without an
 * allow-origin header is discarded by the browser, and the console reports an unreachable server
 * for a runtime that answered correctly. Applying the policy at the two route runners covers every
 * route at once, so a new control route cannot forget it.
 */
export function withControlCors(request: Request, response: Response): Response {
  return withCorsHeaders(response, CONTROL_CORS, request);
}

export function controlJson(body: unknown, status = 200, request?: Request): Response {
  return Response.json(body, {
    status,
    headers: request ? controlCorsHeaders(request) : undefined,
  });
}

/**
 * The unattended entry points answer exactly what the application answered.
 *
 * These routes are called by the deploy callback and by GitHub, not by a
 * browser, but the contract is the same one: `productionDeployCallbackRejected`
 * is a `403`, `productionDeployAlreadyRunning` a `409`,
 * `productionDeployNotConfigured` a `503`. The earlier local mapping turned all
 * three into `401` or `400`, which told the caller to retry a run that was
 * already going.
 */
export function controlError(error: unknown, request?: Request): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const mapped = businessApiErrorStatus(message);
  return Response.json(
    { error: mapped.code },
    { status: mapped.status, headers: request ? controlCorsHeaders(request) : undefined },
  );
}

