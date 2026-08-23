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
    <section className="mb-5 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Route className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-bold">خطة التوصيل الموحّد</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {unifiedDeliveryPlanStatusText(plan.status)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            {String(plan.seller_count)} بائعين
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5">
            <Truck className="h-3.5 w-3.5 text-primary" />
            {plan.strategy === "hybrid" ? "توصيل هجين" : "شحنة موحّدة"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {isBuyer ? (
          <>
            <QuoteAmount
              label="مرجع التوصيل المنفصل المؤكد"
              value={plan.fallback_confirmed_price}
              currency={currency}
            />
            <div className="rounded-lg bg-surface px-3 py-2">
              <p className="text-xs text-muted-foreground">
                حالة المرجع المنفصل
              </p>
              <p className="mt-1 text-sm font-semibold">
                {fallbackKnown
                  ? "قيمة مكتملة"
                  : "قيمة مبدئية وتوجد مواقع تحتاج تسعيرًا"}
              </p>
            </div>
          </>
        ) : null}
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {isBuyer ? "مقدمو الخدمة المدعوون" : "محطات الاستلام في نطاق عرضك"}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {isBuyer ? candidates.length : activeStops.length}
          </p>
        </div>
      </div>

      <div className="border-t border-primary/15 p-4">
        <h3 className="text-sm font-bold">محطات الاستلام</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeStops.map((stop, index) => (
            <div
              key={String(stop.id)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
            >
              <p className="text-xs font-bold">
                {index + 1}.{" "}
                {profileName(
                  details.profiles[String(stop.seller_id)],
                  String(stop.seller_id),
                )}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {deliveryStopAddress(stop.pickup_address_snapshot_json)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {quotes.length > 0 ? (
        <div className="border-t border-primary/15 p-4">
          <h3 className="text-sm font-bold">العروض المتاحة</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                      {formatMoney(quote.total_shipping_price, currency)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
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
        <p className="border-t border-primary/15 px-4 py-3 text-sm text-muted-foreground">
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

      <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 p-4">
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
          <p className="text-xs text-warning">
            يمكن إنشاء الشحنة بعد تجهيز جميع البائعين لعناصرهم بالكامل.
          </p>
        ) : null}
      </div>
    </section>
  );
}
