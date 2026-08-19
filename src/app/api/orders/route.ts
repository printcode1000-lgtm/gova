import { apiSuccess } from "@/core/api/api-response";
import { getMarketplaceOrderQueries } from "@asol/data-core/marketplace-orders";
import { runTracedBusinessRoute } from "../auth/traced-route";
import { actorFromInput } from "@asol/orders-core";
import { mapOrderError } from "./order-api-helpers";

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
      const limit = Number(url.searchParams.get("limit") ?? "5");
      const offset = Number(url.searchParams.get("offset") ?? "0");
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
