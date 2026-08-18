import { assertOrdersEnv, createOrdersRuntime } from '@asol/orders-composition';
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
    /**
     * Layer 2. The composition is the only thing that knows which capabilities this
     * account owns, and it is built so this route cannot reach one the account has no
     * credentials for.
     *
     * Built per request, not at module scope: module scope runs during `next build`,
     * where no account credential exists, so an eager build turned a missing runtime
     * secret into a failed deployment.
     */
    const { database } = createOrdersRuntime();
    assertOrdersEnv();

    const url = new URL(request.url);
    const actor = database.actorFromInput(
      {
        uid: url.searchParams.get('uid') ?? '',
        phone: url.searchParams.get('phone') ?? '',
        role: (url.searchParams.get('role') as never) ?? undefined,
      },
      'buyer',
    );
    const limit = Number(url.searchParams.get('limit') ?? '5');
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const data = await database.listForUser(actor.id, {
      limit,
      offset,
      isAdmin: actor.role === 'admin',
    });
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return orderErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
