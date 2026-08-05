import { timingSafeEqual } from 'node:crypto';
import { NotificationSendService } from '@/features/notifications/services/notification-send-service.server';
import { getNotificationInternalSecret } from '@/core/config/server-env';
import type { SendNotificationToUsersInput } from '@/features/notifications/domain/entities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The receiving end of the account split.
 *
 * The main app resolves who should be notified — it owns the users database —
 * and forwards the uid list here. This route does the fan-out: one provider
 * request per device token, billed to the notifications account.
 *
 * Responses are plain `Response.json` rather than the main app's `apiSuccess`
 * helper on purpose. That helper reaches into system logging and tracing, which
 * would pull half the application's module graph into a service that only needs
 * to send push.
 */
const sendService = new NotificationSendService();

function isAuthorized(request: Request): boolean {
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const expected = getNotificationInternalSecret();
  // Compare only equal-length buffers: timingSafeEqual throws otherwise, and the
  // length check leaks nothing an attacker cannot already measure.
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as SendNotificationToUsersInput;
    // Local, never forwarding: this deployment is the destination, so calling
    // sendToUsers() here could only ever loop back to itself.
    const result = await sendService.sendToUsersLocally(body);
    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'notificationSendFailed';
    // Never echo provider credentials or raw tokens: the message is a stable
    // code from the send service, not upstream provider output.
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204 });
}
