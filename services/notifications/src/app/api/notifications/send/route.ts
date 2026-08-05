import { NotificationSendService } from '@/features/notifications/services/notification-send-service.server';
import { verifyNotificationGrant } from '@/features/notifications/services/notification-grant.server';
import type { SendNotificationToUsersResult } from '@/features/notifications/domain/entities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The receiving end of the split.
 *
 * This deployment knows nothing about the main app: no URL, no database, no
 * shared code path. What arrives is a grant the main app signed — recipients,
 * template, and text all inside the signature — delivered by the user's browser.
 * Verifying it is the whole authorisation step, because a grant *is* a decision
 * the main app already made and nothing in the browser can widen it.
 *
 * There is no bearer-token path. A shared bearer would let anything holding it
 * send anything to anyone; a grant authorises exactly one pre-approved send.
 *
 * Responses are plain `Response.json` rather than the main app's `apiSuccess`
 * helper on purpose: that helper reaches into system logging and tracing, which
 * would pull half the application's module graph into a service that only needs
 * to send push.
 */
const sendService = new NotificationSendService();

/** One browser request may carry several grants; this caps the work per call. */
const MAX_GRANTS_PER_REQUEST = 100;

interface SendRequestBody {
  grant?: string;
  grants?: string[];
}

function corsHeaders(request: Request): Record<string, string> {
  // The browser is the only caller, and the grant — not the origin — is the
  // authority. Credentials are never accepted, so a permissive origin cannot be
  // used to ride on someone's session.
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function readGrants(body: SendRequestBody): string[] {
  const values = [
    ...(typeof body.grant === 'string' ? [body.grant] : []),
    ...(Array.isArray(body.grants) ? body.grants : []),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
  return values.slice(0, MAX_GRANTS_PER_REQUEST);
}

export async function POST(request: Request): Promise<Response> {
  const headers = { ...corsHeaders(request), 'Content-Type': 'application/json' };

  let grants: string[];
  try {
    grants = readGrants((await request.json()) as SendRequestBody);
  } catch {
    return Response.json({ error: 'invalidJsonBody' }, { status: 400, headers });
  }

  if (grants.length === 0) {
    return Response.json({ error: 'notificationGrantRequired' }, { status: 400, headers });
  }

  const results: Array<SendNotificationToUsersResult | { error: string }> = [];
  let accepted = 0;
  let rejected = 0;

  for (const grant of grants) {
    let payload;
    try {
      payload = verifyNotificationGrant(grant);
    } catch (error) {
      // An expired or forged grant is the browser's problem, not a server fault.
      // Reporting it per grant lets one bad entry fail without losing the rest.
      rejected += 1;
      results.push({
        error: error instanceof Error ? error.message : 'notificationGrantInvalid',
      });
      continue;
    }

    try {
      results.push(await sendService.sendToUsersLocally(payload.send));
      accepted += 1;
    } catch (error) {
      rejected += 1;
      results.push({
        error: error instanceof Error ? error.message : 'notificationSendFailed',
      });
    }
  }

  // 200 even with rejections: the request itself was well formed, and the
  // per-grant outcome is in the body. The browser cannot act on a 4xx here
  // anyway — the grants are already spent.
  return Response.json({ accepted, rejected, results }, { status: 200, headers });
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
