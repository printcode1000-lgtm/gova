import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, corsHeaders, preflight } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The account's own delivery test.
 *
 * The body carries a locale and a request id and nothing else: the identity is
 * the verified session, and the notification's text lives in
 * `@asol/notifications-core`, so no caller-supplied content is ever pushed.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { account, devices } = createSubmainRuntime();
    assertSubmainEnv();

    const claims = account.assertSignedIn(request);
    const body = (await request.json().catch(() => ({}))) as {
      locale?: unknown;
      requestId?: unknown;
    };
    const result = await devices.sendSelfTest({
      identity: { uid: claims.uid, phone: claims.phone },
      locale: body?.locale === 'en' ? 'en' : 'ar',
      ...(typeof body?.requestId === 'string' ? { requestId: body.requestId } : {}),
    });
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
