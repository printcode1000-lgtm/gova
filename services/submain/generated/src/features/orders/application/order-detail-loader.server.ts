import "server-only";

import { getMarketplaceOrderQueries } from "@asol/data-core/marketplace-orders";
import { actorFromInput, filterOrderDetailsForActor } from "@asol/orders-core";
import type { MarketplaceOrderDetailsDto } from "@asol/orders-core";
import { profileService } from "@/features/profile/server";
import { logServerSystemIssue } from "@/features/system-logs/server";

/**
 * One order's detail, filtered for the actor asking.
 *
 * Extracted so the canonical route and the `asol-submain` mirror call the same
 * function instead of carrying two copies of it. The handler joins order shards,
 * a profile snapshot per participant, and system logging for the reads that are
 * allowed to fail — transcribing that into a mirror would fork a long contract,
 * and the fork would be invisible until the two answers differed.
 *
 * HTTP stays with the routes: this throws `Forbidden` and `Order not found`, and
 * each route maps them the way its account already maps errors.
 */
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

export async function loadOrderDetailForActor(
  orderId: string,
  searchParams: URLSearchParams,
): Promise<MarketplaceOrderDetailsDto & { profiles: Record<string, unknown> }> {

    const actor = actorFromInput(
      {
        uid: searchParams.get("uid") ?? "",
        phone: searchParams.get("phone") ?? "",
        role: (searchParams.get("role") as any) ?? undefined,
      },
      "buyer",
    );
    const repo = getMarketplaceOrderQueries();
    if (!(await repo.canAccess(orderId, actor))) throw new Error("Forbidden");
    let details = await repo.getDetails(orderId);
    if (!details) throw new Error("Order not found");
    details = filterOrderDetailsForActor(details, actor);
    const order = details.order;
    const sellerIds = Array.from(
      new Set(details.sellerOrders.map((row) => String(row.sellerId))),
    );
    const carrierIds = Array.from(
      new Set(
        details.sellerOrders
          .map(
            (row) =>
              String(row.serviceProviderId ?? "") ||
              String(
                details.orderItems.find(
                  (item) => item.sellerOrderId === row.id,
                )?.shippingNotes ?? "",
              ).replace(/^carrier:/, ""),
          )
          .filter(Boolean),
      ),
    );
    const candidateProviderIds = Array.from(
      new Set(
        details.deliveryPlanCandidates
          .map((row) => String(row.providerId ?? ""))
          .filter(Boolean),
      ),
    );
    const profileEntries = await Promise.all(
      Array.from(
        new Set([
          String(order.buyerId),
          ...sellerIds,
          ...carrierIds,
          ...candidateProviderIds,
        ]),
      ).map(async (uid) => [uid, await profileSnapshot(uid)] as const),
    );
    return {
      ...details,
      profiles: Object.fromEntries(profileEntries),
    };
}
