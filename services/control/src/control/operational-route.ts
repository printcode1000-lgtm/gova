import 'server-only';

import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

export function controlJson(body: unknown, status = 200): Response {
  return Response.json(body, { status });
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
export function controlError(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const mapped = businessApiErrorStatus(message);
  return Response.json({ error: mapped.code }, { status: mapped.status });
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
