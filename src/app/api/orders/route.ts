import { apiSuccess } from "@/core/api/api-response";
import { getMarketplaceOrderQueries } from "@asol/data-core/marketplace-orders";
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { actorFromInput, parseOrderListQuery } from "@asol/orders-core";
import { mapOrderError } from "./order-api-helpers";

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/orders", async () => {
    try {
      const { actorInput, limit, offset } = parseOrderListQuery(
        new URL(request.url).searchParams,
      );
      const actor = actorFromInput(actorInput, "buyer");
      const repo = getMarketplaceOrderQueries();
      return apiSuccess(
        await repo.listForUser(actor.id, {
          limit,
          offset,
          isAdmin: actor.role === "admin",
        }),
      );
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
