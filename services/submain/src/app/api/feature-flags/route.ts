import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, corsHeaders, preflight } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The live control plane for capability-backed features.
 *
 * The read is public by design: the response says which features are switched
 * on, nothing about who is asking. A guest, a logged-out device and the splash
 * screen all see the same switches, so a feature can be withdrawn from every
 * client at once. Supplying an identity asks the admin question instead, and
 * that one can be refused.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { social } = createSubmainRuntime();
    assertSubmainEnv();

    const query = new URL(request.url).searchParams;
    const uid = query.get('uid');
    const phone = query.get('phone');
    if (!uid || !phone) {
      const values = await social.featureFlags.getPublicValues();
      return Response.json(values, { status: 200, headers: corsHeaders(request) });
    }
    const flags = await social.featureFlags.listForAdmin({ uid, phone });
    return Response.json(flags, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const { social } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as {
      identity?: { uid: string; phone: string };
      key?: string;
      enabled?: boolean;
      notes?: string;
    };
    if (!body.identity || typeof body.key !== 'string' || typeof body.enabled !== 'boolean') {
      return Response.json({ error: 'invalidRequest' }, { status: 400, headers: corsHeaders(request) });
    }

    const updated = await social.featureFlags.setFlag({
      identity: body.identity,
      key: body.key,
      enabled: body.enabled,
      notes: body.notes,
    });
    return Response.json(updated, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
