import { apiSuccess } from "@/core/api/api-response";
import { getMarketplaceOrderQueries } from "@/modules/marketplace-orders/api/server";
import { runTracedBusinessRoute } from "../auth/traced-route";
import { actorFromInput, mapOrderError } from "./order-api-helpers";

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/orders", async () => {
    try {
      const url = new URL(request.url);
      const actor = actorFromInput(
        {
          uid: url.searchParams.get("uid") ?? "",
          phone: url.searchParams.get("phone") ?? "",
          role: (url.searchParams.get("role") as any) ?? undefined,
        },
        "buyer",
      );
      const repo = getMarketplaceOrderQueries();
      return apiSuccess(await repo.listForActor(actor));
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
