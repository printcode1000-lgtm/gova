"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  PackageCheck,
  Route,
  Send,
  ShieldCheck,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { OrderActionButton } from "../OrderActionButton";
import { OrderAuditTrail } from "../OrderAuditTrail";
import {
  canCancelStatus,
  canDeliverShipmentItemStatus,
  canRejectDeliveryStatus,
  canRequestReturnStatus,
  carrierFromSellerOrder,
  formatMoney,
  profileAddress,
  profileName,
  queryWithActor,
  statusLabel,
} from "../order-labels";
import type { DbRow, OrderDetails, OrderRole } from "../order-types";

import { RunAction, text, isPendingSellerResponse } from "./OrderDetailsPageContent.navigation-summary";
import { ShippingQuotePanel, CustomRequestRow } from "./OrderDetailsPageContent.shipping-quotes";
import { ProfileLinks, OrderItemRow } from "./OrderDetailsPageContent.order-items";

export function deliveryStopAddress(snapshot: unknown) {
  try {
    const value =
      typeof snapshot === "string"
        ? (JSON.parse(snapshot) as Record<string, unknown>)
        : (snapshot as Record<string, unknown>);
    return String(value?.address ?? "العنوان غير مضاف");
  } catch {
    return "العنوان غير مضاف";
  }
}

export function SellerOrderCard({
  sellerOrder,
  details,
  sessionUid,
  currency,
  admin,
  isBuyer,
  busyAction,
  runAction,
}: {
  sellerOrder: DbRow;
  details: OrderDetails;
  sessionUid: string;
  currency: string;
  admin: boolean;
  isBuyer: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  const sellerId = String(sellerOrder.seller_id ?? "");
  const carrierId = carrierFromSellerOrder(sellerOrder, [
    ...details.orderItems,
    ...details.customItems,
  ]);
  const sellerItems = details.orderItems.filter(
    (item) => String(item.seller_order_id) === String(sellerOrder.id),
  );
  const customItems = details.customItems.filter(
    (item) => String(item.seller_order_id) === String(sellerOrder.id),
  );
  const sellerProfile = details.profiles[sellerId];
  const carrierProfile = carrierId ? details.profiles[carrierId] : null;
  const isSeller = admin || sessionUid === sellerId;
  const isCarrier = admin || (Boolean(carrierId) && sessionUid === carrierId);
  const shippingQuotes = details.shippingQuotes.filter(
    (quote) => String(quote.seller_order_id) === String(sellerOrder.id),
  );
  const shipmentExists = details.shipments.some(
    (shipment) => String(shipment.carrier_id ?? "") === carrierId,
  );
  const unifiedPlan = details.deliveryPlans[0];
  const unifiedPlanActive =
    unifiedPlan &&
    !["separate_selected", "cancelled"].includes(String(unifiedPlan.status));
  const hasPendingItems = [...sellerItems, ...customItems].some((item) =>
    isPendingSellerResponse(item.status),
  );
  const canRejectSellerDelivery = [...sellerItems, ...customItems].some(
    (item) => canRejectDeliveryStatus(item.status),
  );

  return (
    <article className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant pb-3">
        <div>
          <h2 className="font-bold">{profileName(sellerProfile, sellerId)}</h2>
          <p className="text-sm text-muted-foreground">
            {text.sellerStatus}: {statusLabel(sellerOrder.status)}
          </p>
          {carrierId ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {text.carrier}: {profileName(carrierProfile, carrierId)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-error">{text.noCarrier}</p>
          )}
        </div>
        <ProfileLinks sellerId={sellerId} carrierId={carrierId} />
      </div>

      {hasPendingItems ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            isSeller
              ? "bg-primary/10 text-primary"
              : "bg-warning/10 text-warning"
          }`}
        >
          {isSeller ? text.sellerHint : text.notSellerHint}
        </p>
      ) : null}

      {shippingQuotes.length > 0 ? (
        <ShippingQuotePanel
          sellerOrderId={String(sellerOrder.id)}
          quotes={shippingQuotes}
          currency={currency}
          canPropose={isSeller || isCarrier}
          isBuyer={isBuyer}
          busyAction={busyAction}
          runAction={runAction}
        />
      ) : null}

      <div className="mt-4 space-y-3">
        {sellerItems.map((item) => (
          <OrderItemRow
            key={String(item.id)}
            item={item}
            isSeller={isSeller}
            isBuyer={isBuyer}
            currency={currency}
            busyAction={busyAction}
            runAction={runAction}
          />
        ))}
        {customItems.map((item) => (
          <CustomRequestRow
            key={String(item.id)}
            item={item}
            isSeller={isSeller}
            isBuyer={isBuyer}
            currency={currency}
            busyAction={busyAction}
            runAction={runAction}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant pt-3">
        {isBuyer ? (
          <OrderActionButton
            action="buyer_cancel_seller_order"
            busyAction={busyAction}
            id={String(sellerOrder.id)}
            tone="danger"
            onClick={() =>
              runAction("buyer_cancel_seller_order", {
                sellerOrderId: String(sellerOrder.id),
              })
            }
          />
        ) : null}
        {isBuyer && canRejectSellerDelivery ? (
          <OrderActionButton
            action="buyer_reject_delivery_seller_order"
            busyAction={busyAction}
            id={String(sellerOrder.id)}
            tone="danger"
            onClick={() =>
              runAction("buyer_reject_delivery_seller_order", {
                sellerOrderId: String(sellerOrder.id),
              })
            }
          />
        ) : null}
        {admin && carrierId && !shipmentExists && !unifiedPlanActive ? (
          <OrderActionButton
            action="admin_create_seller_shipment"
            busyAction={busyAction}
            id={String(sellerOrder.id)}
            onClick={() =>
              runAction("admin_create_seller_shipment", {
                sellerOrderId: String(sellerOrder.id),
              })
            }
          />
        ) : null}
      </div>
    </article>
  );
}
