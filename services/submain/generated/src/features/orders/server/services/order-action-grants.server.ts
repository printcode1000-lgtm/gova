import "server-only";

import {
  moneyVariablesByLocale,
  type NotificationGrantIssuer,
} from "@/features/notifications/server";
import { logServerSystemIssue } from "@/features/system-logs/server";
import type { ActorRole } from "@asol/orders-core";
import { excludeActorFromPartyUids } from "./order-party-helpers.server";

export interface ActionInput {
  uid: string;
  phone?: string;
  role?: ActorRole;
  action: string;
  itemId?: string;
  customItemId?: string;
  sellerOrderId?: string;
  shipmentId?: string;
  shipmentItemId?: string;
  returnRequestId?: string;
  priceMinor?: number;
  shippingQuoteId?: string;
  deliveryPlanId?: string;
  deliveryPlanQuoteId?: string;
  shippingPriceMinor?: number;
  specialVehicleFeeMinor?: number;
  carrierUid?: string;
  notes?: string;
  reason?: string;
}

export const DELIVERY_PLAN_TEMPLATES = {
  new_quote: "delivery.quoteProposed",
  accepted: "delivery.quoteAccepted",
  rejected: "delivery.quoteRejected",
  separate: "delivery.separateSelected",
} as const;

export function grantDeliveryPlan(
  grants: NotificationGrantIssuer,
  input: {
    uids: string[];
    orderId: string;
    planId: string;
    quoteId?: string;
    status: keyof typeof DELIVERY_PLAN_TEMPLATES;
    amount?: number;
    actorUid?: string | null;
  },
): void {
  const recipients = excludeActorFromPartyUids(input.uids, input.actorUid);
  if (recipients.length === 0) return;
  const issued = grants.issue({
    uids: recipients,
    templateId: DELIVERY_PLAN_TEMPLATES[input.status],
    dedupeKey: `delivery-plan:${input.planId}:${input.quoteId ?? input.status}:${input.status}`,
    variables: { orderId: input.orderId },
    variablesByLocale:
      typeof input.amount === "number"
        ? moneyVariablesByLocale("amount", input.amount)
        : undefined,
    metadata: {
      orderId: input.orderId,
      deliveryPlanId: input.planId,
      deliveryPlanQuoteId: input.quoteId ?? null,
      deliveryPlanStatus: input.status,
      amount: input.amount ?? null,
    },
  });
  if (!issued) {
    void logServerSystemIssue({
      error: new Error("notificationGrantNotIssued"),
      feature: "Orders",
      operation: "notify-delivery-plan",
      routeName: "POST /api/orders/:orderId/actions",
    }).catch(() => undefined);
  }
}

export const SHIPPING_QUOTE_TEMPLATES = {
  pending_buyer: "shipping.quoteProposed",
  accepted: "shipping.quoteAccepted",
  rejected: "shipping.quoteRejected",
} as const;

export const ORDER_RECEIVED_SELLER_TEMPLATE = "order.received" as const;

export const ORDER_BUYER_ADDRESS_SELLER_TEMPLATE = "order.buyerAddressReady" as const;
export const ORDER_BUYER_ADDRESS_PROVIDER_TEMPLATE =
  "order.buyerAddressProvider" as const;
export const ORDER_CARRIER_LINKED_BUYER_TEMPLATE = "order.carrierLinkedBuyer" as const;
export const ORDER_CARRIER_LINKED_PROVIDER_TEMPLATE = "order.carrierLinked" as const;
export const SHIPPING_QUOTE_REQUESTED_TEMPLATE = "shipping.quoteRequested" as const;

export function issueOrderPartyGrant(
  grants: NotificationGrantIssuer,
  input: {
    uids: string[];
    templateId: string;
    dedupeKey: string;
    orderId: string;
    operation: string;
    variables?: Record<string, unknown>;
    variablesByLocale?: ReturnType<typeof moneyVariablesByLocale>;
    metadata?: Record<string, unknown>;
    actorUid?: string | null;
  },
): void {
  const recipients = excludeActorFromPartyUids(input.uids, input.actorUid);
  if (recipients.length === 0) return;
  const issued = grants.issue({
    uids: recipients,
    templateId: input.templateId,
    dedupeKey: input.dedupeKey,
    variables: {
      orderId: input.orderId,
      orderNumber: input.orderId,
      ...input.variables,
    },
    variablesByLocale: input.variablesByLocale,
    metadata: {
      orderId: input.orderId,
      ...input.metadata,
    },
  });
  if (!issued) {
    void logServerSystemIssue({
      error: new Error("notificationGrantNotIssued"),
      feature: "Orders",
      operation: input.operation,
      routeName: "POST /api/orders/:orderId/actions",
    }).catch(() => undefined);
  }
}

export function grantBuyerAddressApplied(
  grants: NotificationGrantIssuer,
  input: {
    orderId: string;
    sellerUids: string[];
    providerUids: string[];
    actorUid?: string | null;
  },
): void {
  issueOrderPartyGrant(grants, {
    uids: input.sellerUids,
    actorUid: input.actorUid,
    templateId: ORDER_BUYER_ADDRESS_SELLER_TEMPLATE,
    dedupeKey: `order.buyer-address:${input.orderId}:sellers`,
    orderId: input.orderId,
    operation: "notify-buyer-address-sellers",
    metadata: { recipientRole: "seller" },
  });
  issueOrderPartyGrant(grants, {
    uids: input.providerUids,
    actorUid: input.actorUid,
    templateId: ORDER_BUYER_ADDRESS_PROVIDER_TEMPLATE,
    dedupeKey: `order.buyer-address:${input.orderId}:providers`,
    orderId: input.orderId,
    operation: "notify-buyer-address-providers",
    metadata: { recipientRole: "service_provider" },
  });
}

export function grantCarrierLinkedToOrder(
  grants: NotificationGrantIssuer,
  input: {
    orderId: string;
    buyerUid: string;
    carrierUid: string;
    sellerOrderId: string;
    actorUid?: string | null;
  },
): void {
  issueOrderPartyGrant(grants, {
    uids: [input.buyerUid],
    actorUid: input.actorUid,
    templateId: ORDER_CARRIER_LINKED_BUYER_TEMPLATE,
    dedupeKey: `order.carrier-linked:${input.orderId}:buyer:${input.sellerOrderId}`,
    orderId: input.orderId,
    operation: "notify-carrier-linked-buyer",
    metadata: {
      recipientRole: "buyer",
      sellerOrderId: input.sellerOrderId,
      carrierUid: input.carrierUid,
    },
  });
  issueOrderPartyGrant(grants, {
    uids: [input.carrierUid],
    actorUid: input.actorUid,
    templateId: ORDER_CARRIER_LINKED_PROVIDER_TEMPLATE,
    dedupeKey: `order.carrier-linked:${input.orderId}:provider:${input.sellerOrderId}`,
    orderId: input.orderId,
    operation: "notify-carrier-linked-provider",
    metadata: {
      recipientRole: "service_provider",
      sellerOrderId: input.sellerOrderId,
      carrierUid: input.carrierUid,
    },
  });
}

export function grantShippingQuoteRequested(
  grants: NotificationGrantIssuer,
  input: {
    orderId: string;
    sellerOrderId: string;
    sellerUid: string;
    providerUid?: string;
    actorUid?: string | null;
  },
): void {
  issueOrderPartyGrant(grants, {
    uids: [input.sellerUid],
    actorUid: input.actorUid,
    templateId: SHIPPING_QUOTE_REQUESTED_TEMPLATE,
    dedupeKey: `shipping-quote-requested:${input.sellerOrderId}:seller`,
    orderId: input.orderId,
    operation: "notify-shipping-quote-requested-seller",
    metadata: {
      sellerOrderId: input.sellerOrderId,
      recipientRole: "seller",
    },
  });
  if (input.providerUid) {
    issueOrderPartyGrant(grants, {
      uids: [input.providerUid],
      actorUid: input.actorUid,
      templateId: SHIPPING_QUOTE_REQUESTED_TEMPLATE,
      dedupeKey: `shipping-quote-requested:${input.sellerOrderId}:provider`,
      orderId: input.orderId,
      operation: "notify-shipping-quote-requested-provider",
      metadata: {
        sellerOrderId: input.sellerOrderId,
        recipientRole: "service_provider",
      },
    });
  }
}

export function grantBuyerOrderCreated(
  grants: NotificationGrantIssuer,
  input: { buyerUid: string; orderId: string; routeName: string },
): void {
  issueOrderPartyGrant(grants, {
    uids: [input.buyerUid],
    templateId: "order.created",
    dedupeKey: `order.created:${input.orderId}:buyer`,
    orderId: input.orderId,
    operation: "notify-buyer-order-created",
    metadata: { recipientRole: "buyer", routeName: input.routeName },
  });
}

export function grantSellerOrderCreated(
  grants: NotificationGrantIssuer,
  input: {
    sellerUids: string[];
    orderId: string;
    source?: string;
    routeName: string;
  },
): void {
  const recipients = Array.from(new Set(input.sellerUids.filter(Boolean)));
  if (recipients.length === 0) return;
  for (const sellerUid of recipients) {
    const issued = grants.issue({
      uids: [sellerUid],
      templateId: ORDER_RECEIVED_SELLER_TEMPLATE,
      dedupeKey: `order.received:${input.orderId}:seller:${sellerUid}`,
      variables: {
        orderId: input.orderId,
        orderNumber: input.orderId,
      },
      metadata: {
        orderId: input.orderId,
        source: input.source ?? null,
        recipientRole: "seller",
      },
    });
    if (!issued) {
      void logServerSystemIssue({
        error: new Error("notificationGrantNotIssued"),
        feature: "Orders",
        operation: "notify-seller-order-created",
        routeName: input.routeName,
      }).catch(() => undefined);
    }
  }
}

export function grantShippingQuote(
  grants: NotificationGrantIssuer,
  input: {
    uids: string[];
    orderId: string;
    quoteId: string;
    status: keyof typeof SHIPPING_QUOTE_TEMPLATES;
    amount: number;
    actorUid?: string | null;
  },
): void {
  const recipients = excludeActorFromPartyUids(input.uids, input.actorUid);
  if (recipients.length === 0) return;
  const issued = grants.issue({
    uids: recipients,
    templateId: SHIPPING_QUOTE_TEMPLATES[input.status],
    dedupeKey: `shipping-quote:${input.quoteId}:${input.status}`,
    variables: { orderId: input.orderId },
    variablesByLocale: moneyVariablesByLocale("amount", input.amount),
    metadata: {
      orderId: input.orderId,
      shippingQuoteId: input.quoteId,
      shippingQuoteStatus: input.status,
      amount: input.amount,
    },
  });
  if (!issued) {
    void logServerSystemIssue({
      error: new Error("notificationGrantNotIssued"),
      feature: "Orders",
      operation: "notify-shipping-quote",
      routeName: "POST /api/orders/:orderId/actions",
    }).catch(() => undefined);
  }
}
