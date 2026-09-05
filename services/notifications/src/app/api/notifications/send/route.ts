import { jsonContractResponse, readJsonContractBody } from '@asol/api-contract-core/server';
import { createCorsPolicy, reflectRequestOrigin, resolveCorsHeaders } from '@asol/cors';
import { assertNotificationsEnv, createNotificationsRuntime } from '@asol/notifications-composition';

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

/**
 * The browser is the only caller, and the grant — not the origin — is the
 * authority. Credentials are never accepted, so a permissive origin cannot be
 * used to ride on someone's session; `@asol/cors` refuses to combine the two.
 *
 * The accepted request-header list is this route's own and deliberately narrow:
 * a grant travels in the body, so no client needs to send anything but a
 * content type here.
 */
const SEND_CORS = createCorsPolicy({
  origins: reflectRequestOrigin(),
  methods: ['POST', 'OPTIONS'],
  headers: ['Content-Type'],
});

function corsHeaders(request: Request): Record<string, string> {
  return resolveCorsHeaders(SEND_CORS, request);
}

export async function POST(request: Request): Promise<Response> {
  const headers = { ...corsHeaders(request), 'Content-Type': 'application/json' };

  let grants: string[];
  try {
    // Layer 2. Built per request, never at module scope: module scope runs during
    // `next build`, where no account credential exists.
    const { crypto } = createNotificationsRuntime();
    assertNotificationsEnv();
    grants = crypto.readGrants(await readJsonContractBody<unknown>(request)).slice(0, crypto.maxGrantsPerRequest);
  } catch (error) {
    // Say why. This catch spans three very different failures — a malformed
    // body, missing account credentials, and a port that was never registered —
    // and swallowing them all as one silent 400 is how an unconfigured
    // deployment passes for a merely badly-addressed request. The outage that
    // took every server route down was invisible for exactly this reason.
    console.error(
      '[notifications/send] rejected before delivery:',
      error instanceof Error ? error.message : error,
    );
    return jsonContractResponse({ error: 'invalidJsonBody' }, { status: 400, headers });
  }

  if (grants.length === 0) {
    return jsonContractResponse({ error: 'notificationGrantRequired' }, { status: 400, headers });
  }

  // 200 even with rejections: the request itself was well formed, and the
  // per-grant outcome is in the body. The browser cannot act on a 4xx here
  // anyway — the grants are already spent.
  return jsonContractResponse(await createNotificationsRuntime().delivery.deliverGrants(grants), { status: 200, headers });
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
