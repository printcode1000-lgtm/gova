import { apiSuccess } from "@/core/api/api-response";
import {
  getMarketplaceOrderQueries,
  getMarketplaceOrderService,
} from "@/modules/data-access/domains/marketplace-orders/index.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";
import { actorFromInput } from "@/modules/marketplace-orders/domain/actor-from-input";
import { mapOrderError, moneyMinor } from "../../../order-api-helpers";
import type { ActorRole } from "@/modules/marketplace-orders/domain/enums";
import {
  notificationsServer,
  moneyVariablesByLocale,
  type NotificationGrantIssuer,
} from "@/features/notifications/server";
import { logServerSystemIssue } from "@/features/system-logs/services/persistent-system-log-service.server";

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
  },
): void {
  const recipients = Array.from(new Set(input.uids.filter(Boolean)));
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

export function grantShippingQuote(
  grants: NotificationGrantIssuer,
  input: {
    uids: string[];
    orderId: string;
    quoteId: string;
    status: keyof typeof SHIPPING_QUOTE_TEMPLATES;
    amount: number;
  },
): void {
  const recipients = Array.from(new Set(input.uids.filter(Boolean)));
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
