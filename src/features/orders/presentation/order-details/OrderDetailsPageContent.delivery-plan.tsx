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
import type { DbRow, OrderDetails, OrderRole } from "../order-types";

import { RunAction, text } from "./OrderDetailsPageContent.navigation-summary";
import { deliveryStopAddress } from "./OrderDetailsPageContent.seller-orders";
import { QuoteAmount } from "./OrderDetailsPageContent.shipping-quotes";
import { unifiedDeliveryPlanStatusText } from "./unified-delivery-plan-model";
import { UnifiedDeliveryQuoteForm } from "./UnifiedDeliveryQuoteForm";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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
  plan: DbRow;
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
    (quote) => String(quote.plan_id) === planId,
  );
  const candidates = details.deliveryPlanCandidates.filter(
    (candidate) => String(candidate.plan_id) === planId,
  );
  const activeStops = details.deliveryPlanStops.filter(
    (stop) =>
      String(stop.plan_id) === planId && String(stop.status) !== "cancelled",
  );
  const candidateStopIds = new Set(
    details.deliveryPlanCandidateStops
      .filter(
        (entry) =>
          String(entry.plan_id) === planId &&
          String(entry.provider_id) === sessionUid,
      )
      .map((entry) => String(entry.stop_id)),
  );
  const candidateSellerOrderIds = new Set(
    activeStops
      .filter((stop) => admin || candidateStopIds.has(String(stop.id)))
      .map((stop) => String(stop.seller_order_id)),
  );
  const isCandidate =
    admin ||
    candidates.some(
      (candidate) => String(candidate.provider_id) === sessionUid,
    );
  const ownPending = quotes.some(
    (quote) =>
      String(quote.provider_id) === sessionUid &&
      quote.status === "pending_buyer",
  );
  const canQuote =
    isCandidate &&
    !ownPending &&
    ["collecting_quotes", "pending_buyer", "reprice_required"].includes(
      String(plan.status),
    );
  const acceptedQuote = quotes.find((quote) => quote.status === "accepted");
  const fallbackKnown = Number(plan.fallback_has_pending_quotes ?? 0) === 0;
  const fallbackAvailable = Number(plan.fallback_available ?? 1) === 1;
  const candidateRequiresSpecialVehicle = details.orderItems.some(
    (item) =>
      (admin || candidateSellerOrderIds.has(String(item.seller_order_id))) &&
      Number(item.requires_special_vehicle ?? 0) === 1,
  );
  const shipmentExists = details.deliveryPlanShipments.some(
    (entry) => String(entry.plan_id) === planId,
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
    <section {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.section.2-ngpS5s", id: "orders.order-details.order-details-page-content.delivery-plan.section.2" })} id="orders.order-details.order-details-page-content.delivery-plan.section" className="mb-5 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 shadow-sm">
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.13-A3iME5", id: "orders.order-details.order-details-page-content.delivery-plan.div.13" })} id="orders.order-details.order-details-page-content.delivery-plan.div" className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/20 p-4">
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.14-I23aWV", id: "orders.order-details.order-details-page-content.delivery-plan.div.14" })} id="orders.order-details.order-details-page-content.delivery-plan.div.2" className="flex items-start gap-3">
          <span {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.span.4-9VYhyY", id: "orders.order-details.order-details-page-content.delivery-plan.span.4" })} id="orders.order-details.order-details-page-content.delivery-plan.span" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Route id="orders.order-details.order-details-page-content.delivery-plan.route" className="h-6 w-6" />
          </span>
          <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.15-NSuH5c", id: "orders.order-details.order-details-page-content.delivery-plan.div.15" })} id="orders.order-details.order-details-page-content.delivery-plan.div.3">
            <h2 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.h2.2-od89bQ", id: "orders.order-details.order-details-page-content.delivery-plan.h2.2" })} id="orders.order-details.order-details-page-content.delivery-plan.h2" className="font-bold">خطة التوصيل الموحّد</h2>
            <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.8-vW5Sy7", id: "orders.order-details.order-details-page-content.delivery-plan.p.8" })} id="orders.order-details.order-details-page-content.delivery-plan.p" className="mt-1 text-sm text-muted-foreground">
              {unifiedDeliveryPlanStatusText(plan.status)}
            </p>
          </div>
        </div>
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.16-DqpC2i", id: "orders.order-details.order-details-page-content.delivery-plan.div.16" })} id="orders.order-details.order-details-page-content.delivery-plan.div.4" className="flex flex-wrap gap-2 text-xs font-semibold">
          <span {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.span.5-0oxX9T", id: "orders.order-details.order-details-page-content.delivery-plan.span.5" })} id="orders.order-details.order-details-page-content.delivery-plan.span.2" className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5">
            <Users id="orders.order-details.order-details-page-content.delivery-plan.users" className="h-3.5 w-3.5 text-primary" />
            {String(plan.seller_count)} بائعين
          </span>
          <span {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.span.6-kC3IA9", id: "orders.order-details.order-details-page-content.delivery-plan.span.6" })} id="orders.order-details.order-details-page-content.delivery-plan.span.3" className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5">
            <Truck id="orders.order-details.order-details-page-content.delivery-plan.truck" className="h-3.5 w-3.5 text-primary" />
            {plan.strategy === "hybrid" ? "توصيل هجين" : "شحنة موحّدة"}
          </span>
        </div>
      </div>

      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.17-Y2ydX6", id: "orders.order-details.order-details-page-content.delivery-plan.div.17" })} id="orders.order-details.order-details-page-content.delivery-plan.div.5" className="grid gap-3 p-4 sm:grid-cols-3">
        {isBuyer ? (
          <>
            <QuoteAmount id="orders.order-details.order-details-page-content.delivery-plan.quote-amount"
              label="مرجع التوصيل المنفصل المؤكد"
              value={plan.fallback_confirmed_price}
              currency={currency}
            />
            <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.18-Lx0AGW", id: "orders.order-details.order-details-page-content.delivery-plan.div.18" })} id="orders.order-details.order-details-page-content.delivery-plan.div.6" className="rounded-lg bg-surface px-3 py-2">
              <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.9-3zUBmK", id: "orders.order-details.order-details-page-content.delivery-plan.p.9" })} id="orders.order-details.order-details-page-content.delivery-plan.p.2" className="text-xs text-muted-foreground">
                حالة المرجع المنفصل
              </p>
              <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.10-1MspD7", id: "orders.order-details.order-details-page-content.delivery-plan.p.10" })} id="orders.order-details.order-details-page-content.delivery-plan.p.3" className="mt-1 text-sm font-semibold">
                {fallbackKnown
                  ? "قيمة مكتملة"
                  : "قيمة مبدئية وتوجد مواقع تحتاج تسعيرًا"}
              </p>
            </div>
          </>
        ) : null}
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.19-6vCQas", id: "orders.order-details.order-details-page-content.delivery-plan.div.19" })} id="orders.order-details.order-details-page-content.delivery-plan.div.7" className="rounded-lg bg-surface px-3 py-2">
          <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.11-kH0WXK", id: "orders.order-details.order-details-page-content.delivery-plan.p.11" })} id="orders.order-details.order-details-page-content.delivery-plan.p.4" className="text-xs text-muted-foreground">
            {isBuyer ? "مقدمو الخدمة المدعوون" : "محطات الاستلام في نطاق عرضك"}
          </p>
          <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.12-H0TFiA", id: "orders.order-details.order-details-page-content.delivery-plan.p.12" })} id="orders.order-details.order-details-page-content.delivery-plan.p.5" className="mt-1 text-sm font-semibold">
            {isBuyer ? candidates.length : activeStops.length}
          </p>
        </div>
      </div>

      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.20-22rkVA", id: "orders.order-details.order-details-page-content.delivery-plan.div.20" })} id="orders.order-details.order-details-page-content.delivery-plan.div.8" className="border-t border-primary/15 p-4">
        <h3 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.h3.3-N8X1GT", id: "orders.order-details.order-details-page-content.delivery-plan.h3.3" })} id="orders.order-details.order-details-page-content.delivery-plan.h3" className="text-sm font-bold">محطات الاستلام</h3>
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.21-bP4F7s", id: "orders.order-details.order-details-page-content.delivery-plan.div.21" })} id="orders.order-details.order-details-page-content.delivery-plan.div.9" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeStops.map((stop, index) => (
            <div
              key={String(stop.id)} {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.22-u8hkSy", id: "orders.order-details.order-details-page-content.delivery-plan.div.22" , instance: createOpaqueUiInstanceId("iter-90aecfb95b", String(String(stop.id)))})}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
            >
              <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.13-2HMsP2", id: "orders.order-details.order-details-page-content.delivery-plan.p.13" , instance: createOpaqueUiInstanceId("iter-7492c619d9", String(String(stop.id)))})} className="text-xs font-bold">
                {index + 1}.{" "}
                {profileName(
                  details.profiles[String(stop.seller_id)],
                  String(stop.seller_id),
                )}
              </p>
              <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.14-AOt3Pr", id: "orders.order-details.order-details-page-content.delivery-plan.p.14" , instance: createOpaqueUiInstanceId("iter-e6f3b3f4e9", String(String(stop.id)))})} className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {deliveryStopAddress(stop.pickup_address_snapshot_json)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {quotes.length > 0 ? (
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.23-89GYnP", id: "orders.order-details.order-details-page-content.delivery-plan.div.23" })} id="orders.order-details.order-details-page-content.delivery-plan.div.10" className="border-t border-primary/15 p-4">
          <h3 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.h3.4-9B0Nrn", id: "orders.order-details.order-details-page-content.delivery-plan.h3.4" })} id="orders.order-details.order-details-page-content.delivery-plan.h3.2" className="text-sm font-bold">العروض المتاحة</h3>
          <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.24-uOLS9O", id: "orders.order-details.order-details-page-content.delivery-plan.div.24" })} id="orders.order-details.order-details-page-content.delivery-plan.div.11" className="mt-3 grid gap-3 md:grid-cols-2">
            {quotes.map((quote) => {
              const providerId = String(quote.provider_id);
              const coveredStopCount = details.deliveryPlanQuoteStops.filter(
                (entry) => String(entry.quote_id) === String(quote.id),
              ).length;
              const coversWholePlan = coveredStopCount === activeStops.length;
              const saving =
                Number(plan.fallback_confirmed_price) -
                Number(quote.total_shipping_price);
              return (
                <article
                  key={String(quote.id)} {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.article-x39nVM", id: "orders.order-details.order-details-page-content.delivery-plan.article" , instance: createOpaqueUiInstanceId("iter-1664325dbd", String(String(quote.id)))})}
                  className={`rounded-xl border bg-surface p-3 ${
                    quote.status === "accepted"
                      ? "border-success/50 ring-1 ring-success/20"
                      : "border-outline-variant"
                  }`}
                >
                  <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.25-2f8RXb", id: "orders.order-details.order-details-page-content.delivery-plan.div.25" , instance: createOpaqueUiInstanceId("iter-2b3324ff79", String(String(quote.id)))})} className="flex items-start justify-between gap-2">
                    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.26-Lu5TCQ", id: "orders.order-details.order-details-page-content.delivery-plan.div.26" , instance: createOpaqueUiInstanceId("iter-c448123a0a", String(String(quote.id)))})}>
                      <h4 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.h4-snP00W", id: "orders.order-details.order-details-page-content.delivery-plan.h4" , instance: createOpaqueUiInstanceId("iter-f09b54b6a5", String(String(quote.id)))})} className="text-sm font-bold">
                        {profileName(details.profiles[providerId], providerId)}
                      </h4>
                      <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.15-DXFu9W", id: "orders.order-details.order-details-page-content.delivery-plan.p.15" , instance: createOpaqueUiInstanceId("iter-1192b3ff2d", String(String(quote.id)))})} className="mt-1 text-xs text-muted-foreground">
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
                    <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.16-X3N0UB", id: "orders.order-details.order-details-page-content.delivery-plan.p.16" , instance: createOpaqueUiInstanceId("iter-aecb835d7f", String(String(quote.id)))})} className="font-bold text-primary">
                      {formatMoney(quote.total_shipping_price, currency)}
                    </p>
                  </div>
                  <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.27-5tyZzK", id: "orders.order-details.order-details-page-content.delivery-plan.div.27" , instance: createOpaqueUiInstanceId("iter-0bd1a19e81", String(String(quote.id)))})} className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <QuoteAmount
                      label="التوصيل"
                      value={quote.base_shipping_price}
                      currency={currency}
                    />
                    <QuoteAmount
                      label="سيارة النقل"
                      value={quote.special_vehicle_fee}
                      currency={currency}
                    />
                  </div>
                  {fallbackKnown && coversWholePlan && saving !== 0 ? (
                    <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.17-2Y7Ghm", id: "orders.order-details.order-details-page-content.delivery-plan.p.17" , instance: createOpaqueUiInstanceId("iter-c41884c5b0", String(String(quote.id)))})}
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
                    <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.18-f90Jhj", id: "orders.order-details.order-details-page-content.delivery-plan.p.18" , instance: createOpaqueUiInstanceId("iter-df9bcd9e22", String(String(quote.id)))})} className="mt-2 text-xs leading-5 text-muted-foreground">
                      {String(quote.notes)}
                    </p>
                  ) : null}
                  {isBuyer && quote.status === "pending_buyer" ? (
                    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.28-riV4ly", id: "orders.order-details.order-details-page-content.delivery-plan.div.28" , instance: createOpaqueUiInstanceId("iter-0533a0a874", String(String(quote.id)))})} className="mt-3 flex flex-wrap gap-2">
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
        <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.19-BZCWx3", id: "orders.order-details.order-details-page-content.delivery-plan.p.19" })} id="orders.order-details.order-details-page-content.delivery-plan.p.6" className="border-t border-primary/15 px-4 py-3 text-sm text-muted-foreground">
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

      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.div.29-tW0ZF5", id: "orders.order-details.order-details-page-content.delivery-plan.div.29" })} id="orders.order-details.order-details-page-content.delivery-plan.div.12" className="flex flex-wrap items-center gap-2 border-t border-primary/15 p-4">
        {isBuyer &&
        fallbackAvailable &&
        !["separate_selected", "cancelled", "completed"].includes(
          String(plan.status),
        ) ? (
          <OrderActionButton
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
          <OrderActionButton
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
          <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.delivery-plan.p.20-BJFl9b", id: "orders.order-details.order-details-page-content.delivery-plan.p.20" })} id="orders.order-details.order-details-page-content.delivery-plan.p.7" className="text-xs text-warning">
            يمكن إنشاء الشحنة بعد تجهيز جميع البائعين لعناصرهم بالكامل.
          </p>
        ) : null}
      </div>
    </section>
  );
}
