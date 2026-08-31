import 'server-only';

import { createSseStream, isIngestRateLimited, normalizeIngestPayload, persistentSystemLogService, readBoundedJsonBody, validateIngestBatchSize } from '@asol/system-logs-core/server';
import { registerControlSystemLogPersistence } from '@/features/system-logs/server/control-persistence.server';
import { extractSessionToken, verifySignedSessionToken } from '@asol/auth-core/session';
import { isSuperAdminIdentity } from '@asol/auth-core/super-admin';
import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

registerControlSystemLogPersistence();

export { createSseStream, isIngestRateLimited, normalizeIngestPayload, persistentSystemLogService, readBoundedJsonBody, validateIngestBatchSize };

export function assertControlSystemLogAccess(request: Request): void {
  const url = new URL(request.url);
  const token = request.headers.get('x-asol-session-token')?.trim() ?? url.searchParams.get('sessionToken')?.trim() ?? '';
  const claims = verifySignedSessionToken(token);
  if (!isSuperAdminIdentity(claims.uid, claims.phone)) throw new Error('forbidden');
}

/**
 * System Logs' own access mapping, matching the application's exactly.
 *
 * This family is the one place where an expired or missing session is a `401`
 * rather than the shared mapping's `400`: the console streams logs and has to
 * tell "sign in again" from "that query was wrong". `forbidden` stays `403`, and
 * everything else falls through to the shared mapping so an unrecognised failure
 * is the same `500 internalServerError` the application answered.
 */
export function systemLogError(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  if (message === 'forbidden') return Response.json({ error: 'forbidden' }, { status: 403 });
  if (message === 'sessionTokenInvalid' || message === 'sessionTokenExpired') {
    return Response.json({ error: message }, { status: 401 });
  }
  const mapped = businessApiErrorStatus(message);
  return Response.json({ error: mapped.code }, { status: mapped.status });
}
