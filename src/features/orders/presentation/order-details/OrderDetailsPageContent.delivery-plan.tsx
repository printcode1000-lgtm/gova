"use client";

import type { DeliveryPlanDto } from "@asol/orders-core";
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
  profileAddress,
  profileName,
  queryWithActor,
  statusLabel,
} from "../order-labels";
import type { OrderDetails, OrderRole } from "../order-types";

import { RunAction, text } from "./OrderDetailsPageContent.navigation-summary";
import { deliveryStopAddress } from "./OrderDetailsPageContent.seller-orders";
import { QuoteAmount } from "./OrderDetailsPageContent.shipping-quotes";
import { unifiedDeliveryPlanStatusText } from "./unified-delivery-plan-model";
import { UnifiedDeliveryQuoteForm } from "./UnifiedDeliveryQuoteForm";

export function UnifiedDeliveryPlanPanel({
  plan,
  details,
  sessionUid,
  currency,
  admin,
  isBuyer,
  busyAction,
  runAction,
}: {
  plan: DeliveryPlanDto;
  details: OrderDetails;
  sessionUid: string;
  currency: string;
  admin: boolean;
  isBuyer: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  const planId = String(plan.id);
  const quotes = details.deliveryPlanQuotes.filter(
    (quote) => String(quote.planId) === planId,
  );
  const candidates = details.deliveryPlanCandidates.filter(
    (candidate) => String(candidate.planId) === planId,
  );
  const activeStops = details.deliveryPlanStops.filter(
    (stop) =>
      String(stop.planId) === planId && String(stop.status) !== "cancelled",
  );
  const candidateStopIds = new Set(
    details.deliveryPlanCandidateStops
      .filter(
        (entry) =>
          String(entry.planId) === planId &&
          String(entry.providerId) === sessionUid,
      )
      .map((entry) => String(entry.stopId)),
  );
  const candidateSellerOrderIds = new Set(
    activeStops
      .filter((stop) => admin || candidateStopIds.has(String(stop.id)))
      .map((stop) => String(stop.sellerOrderId)),
  );
  const isCandidate =
    admin ||
    candidates.some(
      (candidate) => String(candidate.providerId) === sessionUid,
    );
  const ownPending = quotes.some(
    (quote) =>
      String(quote.providerId) === sessionUid &&
      quote.status === "pending_buyer",
  );
  const canQuote =
    isCandidate &&
    !ownPending &&
    ["collecting_quotes", "pending_buyer", "reprice_required"].includes(
      String(plan.status),
    );
  const acceptedQuote = quotes.find((quote) => quote.status === "accepted");
  const fallbackKnown = Number(plan.fallbackHasPendingQuotes ?? 0) === 0;
  const fallbackAvailable = Number(plan.fallbackAvailable ?? 1) === 1;
  const candidateRequiresSpecialVehicle = details.orderItems.some(
    (item) =>
      (admin || candidateSellerOrderIds.has(String(item.sellerOrderId))) &&
      Number(item.requiresSpecialVehicle ?? 0) === 1,
  );
  const shipmentExists = details.deliveryPlanShipments.some(
    (entry) => String(entry.planId) === planId,
  );
  const activeItems = details.orderItems.filter(
    (item) =>
      ![
        "seller_rejected",
        "buyer_cancelled",
        "admin_cancelled",
        "closed",
      ].includes(String(item.status)),
  );
  const allItemsReady =
    activeItems.length > 0 &&
    activeItems.every((item) => String(item.status) === "ready_for_shipping");
  const [baseAmount, setBaseAmount] = React.useState("");
  const [vehicleAmount, setVehicleAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const baseMinor = Math.round(Number(baseAmount) * 100);
  const vehicleMinor = candidateRequiresSpecialVehicle
    ? Math.round(Number(vehicleAmount || "0") * 100)
    : 0;
  const validQuote =
    Number.isSafeInteger(baseMinor) &&
    baseMinor >= 0 &&
    Number.isSafeInteger(vehicleMinor) &&
    vehicleMinor >= 0;
  const sending = busyAction.startsWith(
    "provider_send_unified_delivery_quote:",
  );

  return (
    <section id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-section-1-puhjjt' className="mb-5 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 shadow-sm">
      <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-2-8ew4kr' className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/20 p-4">
        <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-3-mxy2zm' className="flex items-start gap-3">
          <span id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-4-j0ydtj' className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Route id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-route-5-8vhwve' className="h-6 w-6" />
          </span>
          <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-6-ffljuj'>
            <h2 id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-heading-7-jxgg5n' className="font-bold">خطة التوصيل الموحّد</h2>
            <p id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-8-imyzr0' className="mt-1 text-sm text-muted-foreground">
              {unifiedDeliveryPlanStatusText(plan.status)}
            </p>
          </div>
        </div>
        <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-9-y6wdkf' className="flex flex-wrap gap-2 text-xs font-semibold">
          <span id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-10-40omrp' className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5">
            <Users id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-users-11-iomlne' className="h-3.5 w-3.5 text-primary" />
            {String(plan.sellerCount)} بائعين
          </span>
          <span id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-12-8aqtsk' className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5">
            <Truck id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-truck-13-zibfxb' className="h-3.5 w-3.5 text-primary" />
            {plan.strategy === "hybrid" ? "توصيل هجين" : "شحنة موحّدة"}
          </span>
        </div>
      </div>

      <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-14-jrpzpl' className="grid gap-3 p-4 sm:grid-cols-3">
        {isBuyer ? (
          <>
            <QuoteAmount id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-quoteamount-15-o8xkv1'
              label="مرجع التوصيل المنفصل المؤكد"
              value={plan.fallbackConfirmedPrice}
              currency={currency}
            />
            <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-16-nigncb' className="rounded-lg bg-surface px-3 py-2">
              <p id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-17-esoi4a' className="text-xs text-muted-foreground">
                حالة المرجع المنفصل
              </p>
              <p id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-18-ygnfnd' className="mt-1 text-sm font-semibold">
                {fallbackKnown
                  ? "قيمة مكتملة"
                  : "قيمة مبدئية وتوجد مواقع تحتاج تسعيرًا"}
              </p>
            </div>
          </>
        ) : null}
        <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-19-ijsxdp' className="rounded-lg bg-surface px-3 py-2">
          <p id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-20-yd7ezv' className="text-xs text-muted-foreground">
            {isBuyer ? "مقدمو الخدمة المدعوون" : "محطات الاستلام في نطاق عرضك"}
          </p>
          <p id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-21-tqwwd9' className="mt-1 text-sm font-semibold">
            {isBuyer ? candidates.length : activeStops.length}
          </p>
        </div>
      </div>

      <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-22-xsgy8h' className="border-t border-primary/15 p-4">
        <h3 id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-heading-23-gya7vo' className="text-sm font-bold">محطات الاستلام</h3>
        <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-24-bgp5cf' className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeStops.map((stop, index) => (
            <div
              key={String(stop.id)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
            >
              <p className="text-xs font-bold">
                {index + 1}.{" "}
                {profileName(
                  details.profiles[String(stop.sellerId)],
                  String(stop.sellerId),
                )}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {deliveryStopAddress(stop.pickupAddressSnapshotJson)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {quotes.length > 0 ? (
        <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-25-g8z0ps' className="border-t border-primary/15 p-4">
          <h3 id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-heading-26-c3gb6n' className="text-sm font-bold">العروض المتاحة</h3>
          <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-27-quywr6' className="mt-3 grid gap-3 md:grid-cols-2">
            {quotes.map((quote) => {
              const providerId = String(quote.providerId);
              const coveredStopCount = details.deliveryPlanQuoteStops.filter(
                (entry) => String(entry.quoteId) === String(quote.id),
              ).length;
              const coversWholePlan = coveredStopCount === activeStops.length;
              const saving =
                Number(plan.fallbackConfirmedPrice) -
                Number(quote.totalShippingPrice);
              return (
                <article
                  key={String(quote.id)}
                  className={`rounded-xl border bg-surface p-3 ${
                    quote.status === "accepted"
                      ? "border-success/50 ring-1 ring-success/20"
                      : "border-outline-variant"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold">
                        {profileName(details.profiles[providerId], providerId)}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        عرض رقم {String(quote.version)} ·{" "}
                        {quote.status === "accepted"
                          ? "مقبول"
                          : quote.status === "pending_buyer"
                            ? "بانتظار القرار"
                            : quote.status === "rejected"
                              ? "مرفوض"
                              : String(quote.status)}
                        {" · "}
                        يغطي {coveredStopCount} من {activeStops.length} محطات
                      </p>
                    </div>
                    <p className="font-bold text-primary">
                      {formatMoney(quote.totalShippingPrice, currency)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <QuoteAmount
                      label="التوصيل"
                      value={quote.baseShippingPrice}
                      currency={currency}
                    />
                    <QuoteAmount
                      label="سيارة النقل"
                      value={quote.specialVehicleFee}
                      currency={currency}
                    />
                  </div>
                  {fallbackKnown && coversWholePlan && saving !== 0 ? (
                    <p
                      className={`mt-2 text-xs font-semibold ${
                        saving > 0 ? "text-success" : "text-warning"
                      }`}
                    >
                      {saving > 0
                        ? `يوفر ${formatMoney(saving, currency)}`
                        : `أعلى من المنفصل بمقدار ${formatMoney(Math.abs(saving), currency)}`}
                    </p>
                  ) : null}
                  {quote.notes ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {String(quote.notes)}
                    </p>
                  ) : null}
                  {isBuyer && quote.status === "pending_buyer" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <OrderActionButton
                        action="buyer_accept_unified_delivery_quote"
                        busyAction={busyAction}
                        id={String(quote.id)}
                        onClick={() =>
                          runAction("buyer_accept_unified_delivery_quote", {
                            deliveryPlanQuoteId: String(quote.id),
                          })
                        }
                      />
                      <OrderActionButton
                        action="buyer_reject_unified_delivery_quote"
                        busyAction={busyAction}
                        id={String(quote.id)}
                        tone="danger"
                        onClick={() =>
                          runAction("buyer_reject_unified_delivery_quote", {
                            deliveryPlanQuoteId: String(quote.id),
                          })
                        }
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <p id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-28-codqz3' className="border-t border-primary/15 px-4 py-3 text-sm text-muted-foreground">
          لم يصل عرض بعد. سيظل إجمالي الطلب دون رسوم توصيل حتى يختار المشتري
          عرضًا.
        </p>
      )}

      {canQuote ? (
        <UnifiedDeliveryQuoteForm
          planId={planId}
          candidateRequiresSpecialVehicle={candidateRequiresSpecialVehicle}
          baseAmount={baseAmount}
          setBaseAmount={setBaseAmount}
          vehicleAmount={vehicleAmount}
          setVehicleAmount={setVehicleAmount}
          notes={notes}
          setNotes={setNotes}
          validQuote={validQuote}
          sending={sending}
          busyAction={busyAction}
          baseMinor={baseMinor}
          vehicleMinor={vehicleMinor}
          runAction={runAction}
        />
      ) : null}

      <div id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-div-29-uvdyuu' className="flex flex-wrap items-center gap-2 border-t border-primary/15 p-4">
        {isBuyer &&
        fallbackAvailable &&
        !["separate_selected", "cancelled", "completed"].includes(
          String(plan.status),
        ) ? (
          <OrderActionButton elementScope="order-details-page-content-delivery-plan-unified-delivery-plan-panel-order-action-button-7aff4e"
            action="buyer_choose_separate_delivery"
            busyAction={busyAction}
            id={planId}
            tone="danger"
            onClick={() =>
              runAction("buyer_choose_separate_delivery", {
                deliveryPlanId: planId,
              })
            }
          />
        ) : null}
        {admin &&
        plan.status === "accepted" &&
        acceptedQuote &&
        !shipmentExists ? (
          <OrderActionButton elementScope="order-details-page-content-delivery-plan-unified-delivery-plan-panel-order-action-button-ff574f"
            action="admin_create_unified_delivery_shipment"
            busyAction={busyAction}
            id={planId}
            disabled={!allItemsReady}
            onClick={() =>
              runAction("admin_create_unified_delivery_shipment", {
                deliveryPlanId: planId,
              })
            }
          />
        ) : null}
        {admin &&
        plan.status === "accepted" &&
        !allItemsReady &&
        !shipmentExists ? (
          <p id='orders-presentation-order-details-orderdetailspagecontent-delivery-plan-text-32-wweqsa' className="text-xs text-warning">
            يمكن إنشاء الشحنة بعد تجهيز جميع البائعين لعناصرهم بالكامل.
          </p>
        ) : null}
      </div>
    </section>
  );
}
