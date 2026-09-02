"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
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
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { OrderActionButton } from "../OrderActionButton";
import { OrderAuditTrail } from "../OrderAuditTrail";
import {
  canCancelStatus,
  canDeliverShipmentItemStatus,
  canRejectDeliveryStatus,
  canRequestReturnStatus,
  carrierFromSellerOrder,
  formatMoney,
  parseSellerOrderFulfillmentSnapshot,
  profileName,
  queryWithActor,
  sellerFulfillmentReturnsSummary,
  sellerFulfillmentShippingSummary,
  statusLabel,
} from "../order-labels";
import type { DbRow, OrderDetails, OrderRole } from "../order-types";

import { RunAction, text, isPendingSellerResponse } from "./OrderDetailsPageContent.navigation-summary";
import { ShippingQuotePanel, CustomRequestRow } from "./OrderDetailsPageContent.shipping-quotes";
import { ProfileLinks, OrderItemRow } from "./OrderDetailsPageContent.order-items";
import {
  SellerCarrierLinkPanel,
  SellerFulfillmentEditPanel,
} from "./OrderDetailsPageContent.seller-fulfillment-panels";
import { deliveryStopAddress } from "./order-delivery-stop-model";

export { deliveryStopAddress } from "./order-delivery-stop-model";

export function SellerOrderCard({ id,
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
} & { id?: string }) {
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
  const needsCarrierLink = isSeller && !carrierId && !unifiedPlanActive;
  const showFulfillmentEdit =
    isSeller && !["cancelled", "closed"].includes(String(sellerOrder.status));
  const orderId = String(details.order.id ?? sellerOrder.order_id ?? "");
  const fulfillmentSnapshot = parseSellerOrderFulfillmentSnapshot(sellerOrder);

  return (
    <article id={id} className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <div id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-div-2-put7dx" className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant pb-3">
        <div id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-div-3-miw0cr">
          <h2 id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-heading-4-60nssn" className="font-bold">{profileName(sellerProfile, sellerId)}</h2>
          <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-5-a60zei" className="text-sm text-muted-foreground">
            {text.sellerStatus}: {statusLabel(sellerOrder.status)}
          </p>
          {carrierId ? (
            <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-6-hqmens" className="mt-1 text-sm text-muted-foreground">
              {text.carrier}: {profileName(carrierProfile, carrierId)}
            </p>
          ) : (
            <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-7-f4ch9f" className="mt-1 text-sm text-error">{text.noCarrier}</p>
          )}
        </div>
        <ProfileLinks sellerId={sellerId} carrierId={carrierId} />
      </div>

      {needsCarrierLink ? (
        <SellerCarrierLinkPanel
          orderId={orderId}
          sellerOrderId={String(sellerOrder.id)}
          busyAction={busyAction}
          runAction={runAction}
        />
      ) : null}

      {showFulfillmentEdit ? <SellerFulfillmentEditPanel orderId={orderId} /> : null}

      <div id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-div-8-8fsi9l" className="mt-3 rounded-lg border border-outline-variant bg-muted/10 p-3 text-sm">
        <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-9-r4fs1p" className="text-xs font-semibold text-muted-foreground">تسعير الشحن على الطلب</p>
        <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-10-fpab2i" className="mt-1 leading-6 text-on-surface">
          {sellerFulfillmentShippingSummary(fulfillmentSnapshot)}
        </p>
        <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-11-vjjydr" className="mt-3 text-xs font-semibold text-muted-foreground">سياسة الإرجاع على الطلب</p>
        <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-12-yu6bfy" className="mt-1 leading-6 text-on-surface">
          {sellerFulfillmentReturnsSummary(fulfillmentSnapshot)}
        </p>
      </div>

      {hasPendingItems ? (
        <p id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-text-13-lh7yew"
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

      <div id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-div-14-o17rdc" className="mt-4 space-y-3">
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

      <div id="orders-presentation-order-details-orderdetailspagecontent-seller-orders-div-15-pxndt7" className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant pt-3">
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
