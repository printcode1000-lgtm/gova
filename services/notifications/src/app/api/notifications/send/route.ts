import {
  deliverNotificationGrants,
  readGrantsFromRequestBody,
  MAX_GRANTS_PER_REQUEST,
} from '@/features/notifications/service-runtime';

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
 * The route owns HTTP and nothing else. Verification and fan-out live behind
 * `@/features/notifications/service-runtime`, which is the only notification
 * path this deployment may import: reaching further would pull the users
 * repository onto an account that must never hold it, and the build's import
 * mirror would carry it there.
 *
 * Responses are plain `Response.json` rather than the main app's `apiSuccess`
 * helper on purpose: that helper reaches into system logging and tracing, which
 * would pull half the application's module graph into a service that only needs
 * to send push.
 */

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

export async function POST(request: Request): Promise<Response> {
  const headers = { ...corsHeaders(request), 'Content-Type': 'application/json' };

  let grants: string[];
  try {
    grants = readGrantsFromRequestBody(await request.json()).slice(0, MAX_GRANTS_PER_REQUEST);
  } catch {
    return Response.json({ error: 'invalidJsonBody' }, { status: 400, headers });
  }

  if (grants.length === 0) {
    return Response.json({ error: 'notificationGrantRequired' }, { status: 400, headers });
  }

  // 200 even with rejections: the request itself was well formed, and the
  // per-grant outcome is in the body. The browser cannot act on a 4xx here
  // anyway — the grants are already spent.
  return Response.json(await deliverNotificationGrants(grants), { status: 200, headers });
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
