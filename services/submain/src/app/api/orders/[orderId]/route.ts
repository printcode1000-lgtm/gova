import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { corsHeaders, orderDetailErrorResponse, preflight, jsonResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One order's detail, filtered for the actor asking.
 *
 * The join is `loadOrderDetailForActor` — the application's own function, not a
 * copy — so this origin and the canonical route cannot answer the same order
 * differently.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<Response> {
  try {
    const { orders } = createSubmainRuntime();
    assertSubmainEnv();

    const { orderId } = await params;
    const { searchParams } = new URL(request.url);
    const detail = await orders.loadDetail(orderId, searchParams);
    return jsonResponse(request, detail, 200);
  } catch (error) {
    return orderDetailErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
