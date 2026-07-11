import { apiSuccess } from "@/core/api/api-response";
import { getMarketplaceOrderQueries } from "@/modules/marketplace-orders/api/server";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";
import { actorFromInput, mapOrderError } from "../order-api-helpers";

async function profileSnapshot(uid: string) {
  const [contacts, fulfillment, storeDetails] = await Promise.all([
    profileService.getContacts(uid).catch(() => null),
    profileService.getFulfillmentSettings(uid).catch(() => null),
    profileService.getStoreDetails(uid).catch(() => null),
  ]);
  return { uid, contacts, fulfillment, storeDetails };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return runTracedBusinessRoute("GET /api/orders/:orderId", async () => {
    try {
      const { orderId } = await params;
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
      if (!(await repo.canAccess(orderId, actor))) throw new Error("Forbidden");
      const details = await repo.getDetails(orderId);
      if (!details) throw new Error("Order not found");
      const order = details.order as Record<string, unknown>;
      const sellerIds = Array.from(
        new Set(details.sellerOrders.map((row) => String(row.seller_id))),
      );
      const carrierIds = Array.from(
        new Set(
          details.sellerOrders
            .map((row) =>
              String(row.service_provider_id ?? "") ||
              String(
                details.orderItems.find(
                  (item) => item.seller_order_id === row.id,
                )?.shipping_notes ?? "",
              ).replace(/^carrier:/, ""),
            )
            .filter(Boolean),
        ),
      );
      const profileEntries = await Promise.all(
        [String(order.buyer_id), ...sellerIds, ...carrierIds].map(async (uid) => [
          uid,
          await profileSnapshot(uid),
        ] as const),
      );
      return apiSuccess({
        ...details,
        profiles: Object.fromEntries(profileEntries),
      });
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
