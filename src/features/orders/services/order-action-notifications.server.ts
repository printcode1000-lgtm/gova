import "server-only";

import type { NotificationGrantIssuer } from "@/features/notifications/server";
import { moneyVariablesByLocale } from "@/features/notifications/server";
import { getMarketplaceOrderQueries } from "@/modules/data-access/domains/marketplace-orders/index.server";
import { collectOrderPartyUids, excludeActorFromPartyUids } from "./order-party-helpers.server";
import { issueOrderPartyGrant } from "./order-action-grants.server";

type MarketplaceOrderQueries = ReturnType<typeof getMarketplaceOrderQueries>;
type OrderDetails = NonNullable<
  Awaited<ReturnType<MarketplaceOrderQueries["getDetails"]>>
>;

export interface OrderActionNotificationContext {
  itemId?: string;
  customItemId?: string;
  sellerOrderId?: string;
  shipmentId?: string;
  shipmentItemId?: string;
  returnRequestId?: string;
  priceMinor?: number;
  reason?: string;
}

function uniqueUids(values: unknown[], actorUid: string) {
  return excludeActorFromPartyUids(
    values.map((value) => String(value ?? "").trim()).filter(Boolean),
    actorUid,
  );
}

function orderNumber(details: OrderDetails) {
  return String(details.order.order_number ?? details.order.id ?? "");
}

function partiesForSellerOrder(details: OrderDetails, sellerOrderId?: string) {
  if (!sellerOrderId) return { sellerUid: "", providerUid: "" };
  const sellerOrder = details.sellerOrders.find(
    (row) => String(row.id) === sellerOrderId,
  );
  return {
    sellerUid: String(sellerOrder?.seller_id ?? ""),
    providerUid: String(sellerOrder?.service_provider_id ?? ""),
  };
}

function itemProductName(details: OrderDetails, itemId?: string) {
  const item = details.orderItems.find((row) => String(row.id) === itemId);
  return String(item?.product_name ?? "منتج");
}

function customItemTitle(details: OrderDetails, customItemId?: string) {
  const item = details.customItems.find((row) => String(row.id) === customItemId);
  return String(item?.title ?? "طلب خاص");
}

function sellerOrderIdForItem(details: OrderDetails, itemId?: string) {
  const item = details.orderItems.find((row) => String(row.id) === itemId);
  return String(item?.seller_order_id ?? "");
}

function sellerOrderIdForCustomItem(details: OrderDetails, customItemId?: string) {
  const item = details.customItems.find((row) => String(row.id) === customItemId);
  return String(item?.seller_order_id ?? "");
}

function shipmentPartyUids(details: OrderDetails, shipmentId?: string) {
  const shipment = details.shipments.find((row) => String(row.id) === shipmentId);
  if (!shipment) {
    return {
      buyerUid: String(details.order.buyer_id ?? ""),
      carrierUid: "",
      sellerUids: [] as string[],
      providerUids: [] as string[],
    };
  }
  const shipmentItemIds = details.shipmentItems
    .filter((row) => String(row.shipment_id) === String(shipment.id))
    .map((row) => String(row.order_item_id ?? row.custom_request_item_id ?? ""));
  const sellerOrderIds = new Set<string>();
  for (const item of details.orderItems) {
    if (shipmentItemIds.includes(String(item.id))) {
      sellerOrderIds.add(String(item.seller_order_id ?? ""));
    }
  }
  for (const item of details.customItems) {
    if (shipmentItemIds.includes(String(item.id))) {
      sellerOrderIds.add(String(item.seller_order_id ?? ""));
    }
  }
  const sellerUids: string[] = [];
  const providerUids: string[] = [];
  for (const sellerOrderId of sellerOrderIds) {
    const parties = partiesForSellerOrder(details, sellerOrderId);
    if (parties.sellerUid) sellerUids.push(parties.sellerUid);
    if (parties.providerUid) providerUids.push(parties.providerUid);
  }
  return {
    buyerUid: String(details.order.buyer_id ?? ""),
    carrierUid: String(shipment.carrier_id ?? ""),
    sellerUids,
    providerUids,
  };
}

const ACTIONS_WITH_DEDICATED_GRANTS = new Set([
  "seller_assign_delivery_carrier",
  "buyer_apply_delivery_address",
  "seller_send_shipping_quote",
  "buyer_accept_shipping_quote",
  "buyer_reject_shipping_quote",
  "provider_send_unified_delivery_quote",
  "buyer_accept_unified_delivery_quote",
  "buyer_reject_unified_delivery_quote",
  "buyer_choose_separate_delivery",
]);

export async function issueOrderActionNotifications(input: {
  grants: NotificationGrantIssuer;
  orderId: string;
  action: string;
  actorUid: string;
  queries: MarketplaceOrderQueries;
  context?: OrderActionNotificationContext;
}) {
  if (ACTIONS_WITH_DEDICATED_GRANTS.has(input.action)) return;
  const details = await input.queries.getDetails(input.orderId);
  if (!details) return;

  const orderId = input.orderId;
  const actorUid = input.actorUid;
  const ctx = input.context ?? {};
  const grants = input.grants;
  const buyerUid = String(details.order.buyer_id ?? "");
  const parties = collectOrderPartyUids(details.sellerOrders);
  const number = orderNumber(details);

  const notify = (
    uids: string[],
    templateId: string,
    dedupeKey: string,
    operation: string,
    variables: Record<string, unknown> = {},
    metadata: Record<string, unknown> = {},
    variablesByLocale?: ReturnType<typeof moneyVariablesByLocale>,
  ) => {
    issueOrderPartyGrant(grants, {
      uids: uniqueUids(uids, actorUid),
      templateId,
      dedupeKey,
      orderId,
      operation,
      variables: { orderNumber: number, ...variables },
      variablesByLocale,
      metadata,
    });
  };

  switch (input.action) {
    case "seller_accept_item":
      notify(
        [buyerUid],
        "order.sellerAccepted",
        `order.seller-accepted:${ctx.itemId}`,
        "notify-seller-accept-item",
        { productName: itemProductName(details, ctx.itemId) },
        { itemId: ctx.itemId, recipientRole: "buyer" },
      );
      break;
    case "seller_reject_item":
      notify(
        [buyerUid],
        "order.sellerRejected",
        `order.seller-rejected:${ctx.itemId}`,
        "notify-seller-reject-item",
        { productName: itemProductName(details, ctx.itemId) },
        { itemId: ctx.itemId, recipientRole: "buyer" },
      );
      break;
    case "seller_accept_custom_request":
      notify(
        [buyerUid],
        "order.sellerAccepted",
        `order.custom-accepted:${ctx.customItemId}`,
        "notify-seller-accept-custom",
        { productName: customItemTitle(details, ctx.customItemId) },
        { customItemId: ctx.customItemId, recipientRole: "buyer" },
      );
      break;
    case "seller_reject_custom_request":
      notify(
        [buyerUid],
        "order.sellerRejected",
        `order.custom-rejected:${ctx.customItemId}`,
        "notify-seller-reject-custom",
        { productName: customItemTitle(details, ctx.customItemId) },
        { customItemId: ctx.customItemId, recipientRole: "buyer" },
      );
      break;
    case "seller_send_custom_price_offer":
      notify(
        [buyerUid],
        "order.customPriceOffered",
        `order.custom-price-offered:${ctx.customItemId}`,
        "notify-custom-price-offered",
        { productName: customItemTitle(details, ctx.customItemId) },
        { customItemId: ctx.customItemId, recipientRole: "buyer" },
        typeof ctx.priceMinor === "number"
          ? moneyVariablesByLocale("amount", ctx.priceMinor)
          : undefined,
      );
      break;
    case "buyer_accept_custom_price": {
      const linked = partiesForSellerOrder(
        details,
        sellerOrderIdForCustomItem(details, ctx.customItemId),
      );
      notify(
        [linked.sellerUid, linked.providerUid],
        "order.customPriceAccepted",
        `order.custom-price-accepted:${ctx.customItemId}`,
        "notify-custom-price-accepted",
        { productName: customItemTitle(details, ctx.customItemId) },
        { customItemId: ctx.customItemId, recipientRole: "seller" },
      );
      break;
    }
    case "buyer_reject_custom_price": {
      const linked = partiesForSellerOrder(
        details,
        sellerOrderIdForCustomItem(details, ctx.customItemId),
      );
      notify(
        [linked.sellerUid, linked.providerUid],
        "order.customPriceRejected",
        `order.custom-price-rejected:${ctx.customItemId}`,
        "notify-custom-price-rejected",
        { productName: customItemTitle(details, ctx.customItemId) },
        { customItemId: ctx.customItemId, recipientRole: "seller" },
      );
      break;
    }
    case "seller_prepare_item":
      notify(
        [buyerUid],
        "order.itemPreparing",
        `order.item-preparing:${ctx.itemId}`,
        "notify-item-preparing",
        { productName: itemProductName(details, ctx.itemId) },
        { itemId: ctx.itemId, recipientRole: "buyer" },
      );
      break;
    case "seller_ready_item": {
      const linked = partiesForSellerOrder(
        details,
        sellerOrderIdForItem(details, ctx.itemId),
      );
      notify(
        [buyerUid, linked.providerUid],
        "order.itemReady",
        `order.item-ready:${ctx.itemId}`,
        "notify-item-ready",
        { productName: itemProductName(details, ctx.itemId) },
        { itemId: ctx.itemId, recipientRole: "buyer" },
      );
      break;
    }
    case "admin_create_seller_shipment": {
      const linked = partiesForSellerOrder(details, ctx.sellerOrderId);
      notify(
        [buyerUid, linked.sellerUid, linked.providerUid],
        "order.shipmentCreated",
        `order.shipment-created:${ctx.sellerOrderId}`,
        "notify-shipment-created",
        {},
        { sellerOrderId: ctx.sellerOrderId },
      );
      break;
    }
    case "admin_create_unified_delivery_shipment":
      notify(
        [buyerUid, ...parties.sellerUids, ...parties.providerUids],
        "order.shipmentCreated",
        `order.unified-shipment-created:${orderId}`,
        "notify-unified-shipment-created",
      );
      break;
    case "buyer_cancel_item": {
      const linked = partiesForSellerOrder(
        details,
        sellerOrderIdForItem(details, ctx.itemId),
      );
      notify(
        [linked.sellerUid, linked.providerUid],
        "order.cancelled",
        `order.item-cancelled:${ctx.itemId}`,
        "notify-item-cancelled",
        { productName: itemProductName(details, ctx.itemId) },
        { itemId: ctx.itemId, recipientRole: "seller" },
      );
      break;
    }
    case "buyer_cancel_custom_request": {
      const linked = partiesForSellerOrder(
        details,
        sellerOrderIdForCustomItem(details, ctx.customItemId),
      );
      notify(
        [linked.sellerUid, linked.providerUid],
        "order.cancelled",
        `order.custom-cancelled:${ctx.customItemId}`,
        "notify-custom-cancelled",
        { productName: customItemTitle(details, ctx.customItemId) },
        { customItemId: ctx.customItemId, recipientRole: "seller" },
      );
      break;
    }
    case "buyer_cancel_seller_order": {
      const linked = partiesForSellerOrder(details, ctx.sellerOrderId);
      notify(
        [linked.sellerUid, linked.providerUid],
        "order.cancelled",
        `order.seller-order-cancelled:${ctx.sellerOrderId}`,
        "notify-seller-order-cancelled",
        { productName: "طلب البائع" },
        { sellerOrderId: ctx.sellerOrderId, recipientRole: "seller" },
      );
      break;
    }
    case "buyer_cancel_order":
      notify(
        [...parties.sellerUids, ...parties.providerUids],
        "order.cancelled",
        `order.full-cancelled:${orderId}`,
        "notify-order-cancelled",
        { productName: "الطلب بالكامل" },
        { recipientRole: "seller" },
      );
      break;
    case "buyer_reject_delivery_item": {
      const linked = partiesForSellerOrder(
        details,
        sellerOrderIdForItem(details, ctx.itemId),
      );
      notify(
        [linked.sellerUid, linked.providerUid],
        "order.deliveryRejected",
        `order.delivery-rejected-item:${ctx.itemId}`,
        "notify-delivery-rejected-item",
        { productName: itemProductName(details, ctx.itemId) },
        { itemId: ctx.itemId, recipientRole: "seller" },
      );
      break;
    }
    case "buyer_reject_delivery_seller_order": {
      const linked = partiesForSellerOrder(details, ctx.sellerOrderId);
      notify(
        [linked.sellerUid, linked.providerUid],
        "order.deliveryRejected",
        `order.delivery-rejected-seller:${ctx.sellerOrderId}`,
        "notify-delivery-rejected-seller",
        { productName: "طلب البائع" },
        { sellerOrderId: ctx.sellerOrderId, recipientRole: "seller" },
      );
      break;
    }
    case "buyer_reject_delivery_order":
      notify(
        [...parties.sellerUids, ...parties.providerUids],
        "order.deliveryRejected",
        `order.delivery-rejected:${orderId}`,
        "notify-delivery-rejected-order",
        { productName: "الطلب بالكامل" },
        { recipientRole: "seller" },
      );
      break;
    case "buyer_request_return_item": {
      const linked = partiesForSellerOrder(
        details,
        sellerOrderIdForItem(details, ctx.itemId),
      );
      notify(
        [linked.sellerUid],
        "return.requested",
        `return.requested:${ctx.itemId}`,
        "notify-return-requested",
        { productName: itemProductName(details, ctx.itemId) },
        { itemId: ctx.itemId, recipientRole: "seller" },
      );
      break;
    }
    case "seller_approve_return":
      notify(
        [buyerUid],
        "order.returnApproved",
        `return.approved:${ctx.returnRequestId}`,
        "notify-return-approved",
        {},
        { returnRequestId: ctx.returnRequestId, recipientRole: "buyer" },
      );
      break;
    case "seller_reject_return":
      notify(
        [buyerUid],
        "order.returnRejected",
        `return.rejected:${ctx.returnRequestId}`,
        "notify-return-rejected",
        {},
        { returnRequestId: ctx.returnRequestId, recipientRole: "buyer" },
      );
      break;
    case "carrier_receive_shipment":
    case "carrier_reject_shipment":
    case "carrier_in_transit":
    case "carrier_out_for_delivery":
    case "carrier_delivered":
    case "carrier_deliver_shipment_item": {
      let shipmentId = ctx.shipmentId;
      if (!shipmentId && ctx.shipmentItemId) {
        const shipmentItem = details.shipmentItems.find(
          (row: Record<string, unknown>) => String(row.id) === ctx.shipmentItemId,
        );
        shipmentId = String(shipmentItem?.shipment_id ?? "");
      }
      const shipmentParties = shipmentPartyUids(details, shipmentId);
      const templateByAction: Record<string, string> = {
        carrier_receive_shipment: "shipment.receivedByCarrier",
        carrier_reject_shipment: "shipment.rejectedByCarrier",
        carrier_in_transit: "shipment.inTransit",
        carrier_out_for_delivery: "shipment.outForDelivery",
        carrier_delivered: "shipment.delivered",
        carrier_deliver_shipment_item: "shipment.delivered",
      };
      notify(
        [
          shipmentParties.buyerUid,
          ...shipmentParties.sellerUids,
          ...shipmentParties.providerUids,
        ],
        templateByAction[input.action] ?? "shipment.updated",
        `shipment:${input.action}:${ctx.shipmentId ?? ctx.shipmentItemId}`,
        `notify-${input.action}`,
        {},
        {
          shipmentId: ctx.shipmentId ?? null,
          shipmentItemId: ctx.shipmentItemId ?? null,
          recipientRole: "buyer",
        },
      );
      break;
    }
    default:
      break;
  }
}

export async function finalizeOrderActionResponse<T extends Record<string, unknown>>(
  input: Parameters<typeof issueOrderActionNotifications>[0] & { result: T },
) {
  const { result, ...payload } = input;
  await issueOrderActionNotifications(payload);
  const { notificationsServer } = await import("@/features/notifications/server");
  return notificationsServer.attachGrants(result, payload.grants.toArray());
}
