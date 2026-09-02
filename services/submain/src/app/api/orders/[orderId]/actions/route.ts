import {
  assertSubmainEnv,
  createSubmainRuntime,
  type ActionInput,
} from '@asol/submain-composition';

import { corsHeaders, orderDetailErrorResponse, preflight } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The HTTP edge of an order action. The action itself is the application's. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<Response> {
  try {
    const { orders } = createSubmainRuntime();
    assertSubmainEnv();

    const { orderId } = await params;
    const body = (await request.json()) as ActionInput;
    const result = await orders.executeAction(orderId, body);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return orderDetailErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
