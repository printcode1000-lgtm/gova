import { resolveServiceOrigin } from '../index';
import type { NotificationGrantDeliveryIdentity } from '../ports/app-bridge';
import { resolveMainApiBaseUrl } from './types';

/**
 * POST to one of the native sender's session-bound routes.
 *
 * The URL goes straight to the route's owner, so a POST never depends on a
 * cross-origin `307` from the compatibility boundary; the main API origin is
 * only the fallback for an unconfigured owner. The caller is the signed
 * session header — no identity travels in the body.
 */
export function postSessionRoute(
  path: string,
  identity: NotificationGrantDeliveryIdentity,
  body: Record<string, unknown>,
): Promise<Response> | null {
  const sessionToken = identity.sessionToken.trim();
  if (!sessionToken) return null;
  const origin = (resolveServiceOrigin('POST', path) ?? resolveMainApiBaseUrl()).replace(/\/$/, '');
  if (!origin) return null;
  return fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-asol-session-token': sessionToken,
    },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
  });
}
