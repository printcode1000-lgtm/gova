import "server-only";

import { authService } from "@/features/auth/services/auth-service.bootstrap.server";
import { notificationsServer, type NotificationGrantIssuer } from "@/features/notifications/server";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import type { MarketplaceOrderService } from "@asol/data-core/marketplace-orders";
import {
  getMarketplaceOrderQueries,
} from "@asol/data-core/marketplace-orders";
import type { Actor } from "@asol/orders-core";
import { fulfillmentSettingsToSnapshot } from "@asol/orders-core";

import { bootstrapLocationShippingQuotes } from "./order-shipping-bootstrap.server";
import { collectOrderPartyUids } from "./order-party-helpers.server";
import {
  grantBuyerAddressApplied,
  grantCarrierLinkedToOrder,
  grantShippingQuoteRequested,
  issueOrderPartyGrant,
} from "./order-action-grants.server";

type MarketplaceOrderQueries = ReturnType<typeof getMarketplaceOrderQueries>;
type OrderDetails = NonNullable<Awaited<ReturnType<MarketplaceOrderQueries["getDetails"]>>>;

function hasDeliveryAddress(order: Record<string, unknown>) {
  try {
    const raw =
      typeof order.delivery_address_snapshot_json === "string"
        ? JSON.parse(order.delivery_address_snapshot_json)
        : order.delivery_address_snapshot_json;
    return Boolean(String((raw as { address?: string })?.address ?? "").trim());
  } catch {
    return false;
  }
}

export async function issueShippingQuoteBootstrapGrants(
  grants: NotificationGrantIssuer,
  orderId: string,
  details: OrderDetails,
  createdSellerOrderIds: string[],
  actorUid?: string | null,
) {
  for (const sellerOrderId of createdSellerOrderIds) {
    const sellerOrder = details.sellerOrders.find(
      (row) => String(row.id) === sellerOrderId,
    );
    if (!sellerOrder) continue;
    grantShippingQuoteRequested(grants, {
      orderId,
      sellerOrderId,
      sellerUid: String(sellerOrder.seller_id ?? ""),
      providerUid: String(sellerOrder.service_provider_id ?? "") || undefined,
      actorUid,
    });
  }
}

export async function applyBuyerDeliveryToOrder(
  orderId: string,
  buyerUid: string,
  buyerPhone: string | undefined,
  service: MarketplaceOrderService,
  queries: MarketplaceOrderQueries,
  actor: Actor,
  grants: NotificationGrantIssuer,
) {
  const [buyerContacts, authPhone] = await Promise.all([
    profileService.getContacts(buyerUid),
    authService.getUserPhone(buyerUid),
  ]);
  const phone =
    buyerContacts.phones[0]?.number?.trim() ||
    buyerPhone?.trim() ||
    authPhone ||
    "";
  const location = buyerContacts.locations[0];
  const address = String(location?.address ?? "").trim();
  if (!address) throw new Error("Buyer address is required");

  const order = await service.buyerUpdateDeliveryAddress(
    orderId,
    {
      phone,
      address,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      paymentMethod: "cash_on_delivery",
    },
    actor,
  );

  let details = await queries.getDetails(orderId);
  if (!details) throw new Error("Order not found");

  const createdSellerOrderIds = await bootstrapLocationShippingQuotes(
    orderId,
    details,
    service,
    actor,
  );

  details = (await queries.getDetails(orderId)) ?? details;
  const parties = collectOrderPartyUids(details.sellerOrders);
  grantBuyerAddressApplied(grants, {
    orderId,
    sellerUids: parties.sellerUids,
    providerUids: parties.providerUids,
    actorUid: buyerUid,
  });
  await issueShippingQuoteBootstrapGrants(
    grants,
    orderId,
    details,
    createdSellerOrderIds,
    buyerUid,
  );

  return { order, createdShippingQuotes: createdSellerOrderIds.length };
}

export async function applyCarrierToOrder(
  orderId: string,
  sellerOrderId: string,
  carrierUid: string,
  service: MarketplaceOrderService,
  queries: MarketplaceOrderQueries,
  actor: Actor,
  grants: NotificationGrantIssuer,
) {
  const sellerOrder = await service.assignSellerOrderCarrier(
    sellerOrderId,
    carrierUid,
    actor,
  );

  let details = await queries.getDetails(orderId);
  if (!details) throw new Error("Order not found");

  grantCarrierLinkedToOrder(grants, {
    orderId,
    buyerUid: String(details.order.buyer_id ?? ""),
    carrierUid,
    sellerOrderId,
    actorUid: actor.id,
  });

  details = (await queries.getDetails(orderId)) ?? details;
  const createdSellerOrderIds = hasDeliveryAddress(
    details.order as Record<string, unknown>,
  )
    ? await bootstrapLocationShippingQuotes(orderId, details, service, actor)
    : [];
  if (createdSellerOrderIds.length > 0) {
    details = (await queries.getDetails(orderId)) ?? details;
    await issueShippingQuoteBootstrapGrants(
      grants,
      orderId,
      details,
      createdSellerOrderIds,
      actor.id,
    );
  }

  return sellerOrder;
}

export async function syncSellerFulfillmentToOpenOrders(
  sellerUid: string,
  service: MarketplaceOrderService,
  grants: NotificationGrantIssuer,
) {
  const settings = await profileService.getFulfillmentSettings(sellerUid);
  const snapshot = fulfillmentSettingsToSnapshot(settings);
  const affected = await service.syncSellerFulfillmentToOpenOrders(
    sellerUid,
    snapshot,
    { id: sellerUid, role: "seller" },
  );
  const queries = getMarketplaceOrderQueries();
  for (const orderId of affected.buyerNotifyOrderIds) {
    const buyerUid = affected.buyerUidByOrder.get(orderId);
    const details = await queries.getDetails(orderId);
    const parties = details
      ? collectOrderPartyUids(details.sellerOrders)
      : { sellerUids: [], providerUids: [] };
    if (buyerUid) {
      issueOrderPartyGrant(grants, {
        uids: [buyerUid],
        actorUid: sellerUid,
        templateId: "order.fulfillmentUpdated",
        dedupeKey: `order.fulfillment-sync:${orderId}:${sellerUid}:buyer`,
        orderId,
        operation: "notify-fulfillment-sync-buyer",
        metadata: { recipientRole: "buyer", source: "fulfillment_sync", sellerUid },
      });
    }
    issueOrderPartyGrant(grants, {
      uids: parties.providerUids,
      actorUid: sellerUid,
      templateId: "order.fulfillmentUpdated",
      dedupeKey: `order.fulfillment-sync:${orderId}:${sellerUid}:providers`,
      orderId,
      operation: "notify-fulfillment-sync-providers",
      metadata: { recipientRole: "service_provider", source: "fulfillment_sync", sellerUid },
    });
  }
  return affected.orderIds;
}
