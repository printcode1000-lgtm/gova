import { apiSuccess } from "@/core/api/api-response";
import { getMarketplaceOrderQueries } from "@asol/data-core/marketplace-orders";
import { filterOrderDetailsForActor } from "@asol/orders-core";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { logServerSystemIssue } from "@/features/system-logs/services/persistent-system-log-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { actorFromInput } from "@asol/orders-core";
import { mapOrderError } from "../order-api-helpers";

async function profileSnapshot(uid: string) {
  const [contacts, fulfillment, storeDetails] = await Promise.all([
    profileService.getContacts(uid).catch((error) => {
      void logServerSystemIssue({
        error,
        feature: "Orders",
        operation: "load-order-profile-contacts",
        routeName: "GET /api/orders/:orderId",
      }).catch(() => undefined);
      return null;
    }),
    profileService.getFulfillmentSettings(uid).catch((error) => {
      void logServerSystemIssue({
        error,
        feature: "Orders",
        operation: "load-order-profile-fulfillment",
        routeName: "GET /api/orders/:orderId",
      }).catch(() => undefined);
      return null;
    }),
    profileService.getStoreDetails(uid).catch((error) => {
      void logServerSystemIssue({
        error,
        feature: "Orders",
        operation: "load-order-profile-store-details",
        routeName: "GET /api/orders/:orderId",
      }).catch(() => undefined);
      return null;
    }),
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
      let details = await repo.getDetails(orderId);
      if (!details) throw new Error("Order not found");
      details = filterOrderDetailsForActor(details, actor);
      const order = details.order as Record<string, unknown>;
      const sellerIds = Array.from(
        new Set(details.sellerOrders.map((row) => String(row.seller_id))),
      );
      const carrierIds = Array.from(
        new Set(
          details.sellerOrders
            .map(
              (row) =>
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
      const candidateProviderIds = Array.from(
        new Set(
          details.deliveryPlanCandidates
            .map((row) => String(row.provider_id ?? ""))
            .filter(Boolean),
        ),
      );
      const profileEntries = await Promise.all(
        Array.from(
          new Set([
            String(order.buyer_id),
            ...sellerIds,
            ...carrierIds,
            ...candidateProviderIds,
          ]),
        ).map(async (uid) => [uid, await profileSnapshot(uid)] as const),
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
