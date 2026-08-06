import { getMarketplaceOrderQueries } from '@/modules/data-access/domains/marketplace-orders/index.server';
import { actorFromInput } from '@/modules/marketplace-orders/domain/actor-from-input';
import { corsHeaders, orderErrorResponse, preflight } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The order list.
 *
 * This is the only order route that lives here. `GET /api/orders/[orderId]`
 * stays on the main app because it enriches the order with the buyer's and
 * seller's profile contacts, fulfilment settings, and store details — data in
 * the profile shards, which this account has no credentials for.
 *
 * Writes stay on the main app too: creating an order spans several shards plus
 * the profile and product databases, and splitting that across accounts would
 * turn one operation into several that can fail half-done.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const actor = actorFromInput(
      {
        uid: url.searchParams.get('uid') ?? '',
        phone: url.searchParams.get('phone') ?? '',
        role: (url.searchParams.get('role') as never) ?? undefined,
      },
      'buyer',
    );
    const data = await getMarketplaceOrderQueries().listForActor(actor);
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return orderErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
