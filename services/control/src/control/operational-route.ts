import 'server-only';

import { BROWSER_REQUEST_HEADERS } from '@asol/service-runtime-core';

import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

/**
 * Control answers a browser, not only a machine.
 *
 * These routes were written for the deploy callback and for GitHub, so they
 * carried no CORS headers at all and every preflight got a bare `204`. The
 * Super Admin console is a browser client on a different origin: without
 * `Access-Control-Allow-Origin` on the preflight the browser refuses to send
 * the request, and the console reports `Unable to reach the server` for a
 * runtime that is up and answering. Every Super Admin surface was unreachable
 * that way — user search, System Logs, OTA administration, build jobs.
 *
 * The header list is `BROWSER_REQUEST_HEADERS`, shared with the six workloads,
 * so no origin can answer a narrower list than the client sends.
 */
export function controlCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': BROWSER_REQUEST_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** The preflight every control route answers. */
export function controlPreflight(request: Request): Response {
  return new Response(null, { status: 204, headers: controlCorsHeaders(request) });
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

/**
 * The GitHub OIDC entry point's two extra translations.
 *
 * They are the route's own, not the shared mapping's: a rejected push identity
 * is reported as `forbidden` with `401` rather than `403`, so a misconfigured
 * workflow reads as "authenticate" and not "you are the wrong user", and an
 * unconfigured GitHub deploy is the same `503` as an unconfigured deploy.
 */
export function gitHubDeployError(error: unknown): Response {
  const message = error instanceof Error ? error.message : '';
  if (message === 'githubDeployIdentityRejected') {
    return Response.json({ error: 'forbidden' }, { status: 401 });
  }
  if (message === 'githubDeployNotConfigured') {
    return Response.json({ error: 'productionDeployNotConfigured' }, { status: 503 });
  }
  return controlError(error);
}
