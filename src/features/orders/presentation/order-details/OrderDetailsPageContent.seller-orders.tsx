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
  RotateCcw,
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
  parseSellerOrderFulfillmentSnapshot,
  profileFulfillmentSectionHref,
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
import { useProfileFulfillmentSettings } from "@/features/profile/hooks/use-profile-fulfillment-settings";
import { useProfileCarrierLabels } from "@/features/profile/hooks/use-profile-carrier-labels";

function SellerCarrierLinkPanel({
  orderId,
  sellerOrderId,
  busyAction,
  runAction,
}: {
  orderId: string;
  sellerOrderId: string;
  busyAction: string;
  runAction: RunAction;
}) {
  const { settings: fulfillmentSettings, isLoading: loadingFulfillment } =
    useProfileFulfillmentSettings();
  const carrierUids = fulfillmentSettings.carrierUids.filter(Boolean);
  const [selectedCarrierUid, setSelectedCarrierUid] = React.useState(
    carrierUids[0] ?? "",
  );
  React.useEffect(() => {
    if (carrierUids.length > 0 && !carrierUids.includes(selectedCarrierUid)) {
      setSelectedCarrierUid(carrierUids[0]);
    }
  }, [carrierUids, selectedCarrierUid]);
  const carrierLabels = useProfileCarrierLabels(carrierUids);
  const labelForUid = (uid: string) =>
    carrierLabels.find((entry) => entry.uid === uid)?.label ?? uid;
  const profileHref = `/profile?mode=edit&tab=fulfillment&returnTo=${encodeURIComponent(
    `/orders/details?orderId=${orderId}&role=seller`,
  )}`;

  if (loadingFulfillment) {
    return (
      <div className="mt-3 rounded-lg border border-outline-variant bg-muted/20 p-3 text-sm text-muted-foreground">
        جاري تحميل إعدادات الشحن...
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <p className="leading-6 text-on-surface">{text.noCarrierSellerHint}</p>
      {carrierUids.length > 1 ? (
        <label className="mt-3 block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            مقدم التوصيل
          </span>
          <select
            value={selectedCarrierUid}
            onChange={(event) => setSelectedCarrierUid(event.target.value)}
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
          >
            {carrierUids.map((uid) => (
              <option key={uid} value={uid}>
                {labelForUid(uid)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={profileHref}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface transition"
        >
          <Truck className="h-4 w-4" />
          {text.linkCarrierInProfile}
        </Link>
        {selectedCarrierUid ? (
          <OrderActionButton
            action="seller_assign_delivery_carrier"
            busyAction={busyAction}
            id={sellerOrderId}
            onClick={() =>
              runAction("seller_assign_delivery_carrier", {
                sellerOrderId,
                carrierUid: selectedCarrierUid,
              })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function SellerFulfillmentEditPanel({ orderId }: { orderId: string }) {
  return (
    <div className="mt-3 rounded-lg border border-outline-variant bg-muted/20 p-3 text-sm">
      <p className="leading-6 text-on-surface">{text.sellerFulfillmentHint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={profileFulfillmentSectionHref(orderId, "shipping")}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface transition"
        >
          <CircleDollarSign className="h-4 w-4" />
          {text.editShippingPricing}
        </Link>
        <Link
          href={profileFulfillmentSectionHref(orderId, "returns")}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface transition"
        >
          <RotateCcw className="h-4 w-4" />
          {text.editReturnPolicy}
        </Link>
      </div>
    </div>
  );
}

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
  const needsCarrierLink = isSeller && !carrierId && !unifiedPlanActive;
  const showFulfillmentEdit =
    isSeller && !["cancelled", "closed"].includes(String(sellerOrder.status));
  const orderId = String(details.order.id ?? sellerOrder.order_id ?? "");
  const fulfillmentSnapshot = parseSellerOrderFulfillmentSnapshot(sellerOrder);

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

      {needsCarrierLink ? (
        <SellerCarrierLinkPanel
          orderId={orderId}
          sellerOrderId={String(sellerOrder.id)}
          busyAction={busyAction}
          runAction={runAction}
        />
      ) : null}

      {showFulfillmentEdit ? <SellerFulfillmentEditPanel orderId={orderId} /> : null}

      <div className="mt-3 rounded-lg border border-outline-variant bg-muted/10 p-3 text-sm">
        <p className="text-xs font-semibold text-muted-foreground">تسعير الشحن على الطلب</p>
        <p className="mt-1 leading-6 text-on-surface">
          {sellerFulfillmentShippingSummary(fulfillmentSnapshot)}
        </p>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">سياسة الإرجاع على الطلب</p>
        <p className="mt-1 leading-6 text-on-surface">
          {sellerFulfillmentReturnsSummary(fulfillmentSnapshot)}
        </p>
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
