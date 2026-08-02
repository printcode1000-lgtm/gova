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
import { OrderActionButton } from "./OrderActionButton";
import { OrderAuditTrail } from "./OrderAuditTrail";
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
} from "./order-labels";
import type { DbRow, OrderDetails, OrderRole } from "./order-types";

type RunAction = (
  action: string,
  payload: Record<string, string | number>,
) => void;

const text = {
  loadFailed: "تعذر تحميل الطلب.",
  actionFailed: "تعذر تنفيذ الإجراء.",
  actionReason: "تم التنفيذ من صفحة الطلب",
  loginRequired: "يجب تسجيل الدخول لعرض تفاصيل الطلب.",
  detailsTitle: "تفاصيل الطلب",
  notFound: "لم يتم العثور على الطلب.",
  back: "العودة للطلبات",
  order: "طلب",
  status: "الحالة",
  cod: "الدفع عند الاستلام فقط",
  adminAllRoles: "السوبر أدمن يتحكم بكل الأدوار",
  total: "إجمالي الطلب",
  remaining: "المبلغ المتبقي",
  buyerAddress: "عنوان المشتري",
  noAddress: "لا يوجد عنوان محفوظ",
  sellerStatus: "حالة البائع",
  carrier: "مقدم التوصيل",
  noCarrier: "لا يوجد مقدم توصيل مرتبط بهذا البائع.",
  sellerProfile: "بروفايل البائع",
  carrierProfile: "بروفايل التوصيل",
  product: "منتج",
  quantity: "الكمية",
  itemStatus: "الحالة",
  sellerHint:
    "المطلوب الآن من البائع: قبول أو رفض المنتجات الجديدة في هذه البطاقة.",
  notSellerHint:
    "أزرار قبول ورفض المنتجات تظهر لحساب البائع صاحب هذه البطاقة أو للسوبر أدمن فقط.",
  orderActions: "إجراءات الطلب",
  shipments: "الشحنات",
  noShipments: "لم يتم إنشاء شحنات بعد.",
  carrierCompany: "شركة التوصيل",
  unknown: "غير محدد",
  returns: "الإرجاع",
  noReturns: "لا توجد طلبات إرجاع بعد.",
  returnStatus: "حالة الإرجاع",
  returnReason: "سبب الإرجاع",
  shipmentItems: "عناصر الشحنة",
};

function isPendingSellerResponse(status: unknown) {
  return ["new", "waiting_for_seller_response"].includes(String(status));
}

export function OrderDetailsPageContent({ orderId }: { orderId: string }) {
  const { session, isLoading: sessionLoading } = useSession();
  const searchParams = useSearchParams();
  const admin = isSuperAdmin(session);
  const requestedRole = (searchParams.get("role") ?? "buyer") as OrderRole;
  const activeRole: OrderRole = admin ? "admin" : requestedRole;
  const [details, setDetails] = React.useState<OrderDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState("");
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    if (!session?.uid) return;
    setLoading(true);
    setError("");
    try {
      const route = `${ASOL_API_ROUTES.orders.byId(orderId)}?${queryWithActor(
        session.uid,
        session.phone,
        activeRole,
      )}`;
      setDetails(await asolApi.get<OrderDetails>(route));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [activeRole, orderId, session?.phone, session?.uid]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runAction: RunAction = async (action, payload) => {
    if (!session?.uid) return;
    setBusyAction(`${action}:${Object.values(payload).join(":")}`);
    setError("");
    try {
      await asolApi.post(
        ASOL_API_ROUTES.orders.actions(orderId),
        {
          uid: session.uid,
          phone: session.phone,
          role: activeRole,
          action,
          reason:
            action.includes("cancel") || action.includes("reject")
              ? text.actionReason
              : undefined,
          ...payload,
        },
        { suppressErrorLog: true },
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : text.actionFailed);
    } finally {
      setBusyAction("");
    }
  };

  if (sessionLoading || loading) {
    return (
      <main className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!session?.uid) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{text.detailsTitle}</h1>
        <p className="mt-3 text-muted-foreground">{text.loginRequired}</p>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <BackToOrders />
        <p className="mt-6 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error || text.notFound}
        </p>
      </main>
    );
  }

  const order = details.order;
  const buyerId = String(order.buyer_id ?? "");
  const buyer = details.profiles[buyerId];
  const buyerLocation = profileAddress(buyer);
  const currency = String(order.currency ?? "EGP");
  const isBuyer = admin || session.uid === buyerId;
  const canRejectAnyDelivery = [
    ...details.orderItems,
    ...details.customItems,
  ].some((item) => canRejectDeliveryStatus(item.status));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <BackToOrders />
          <h1 className="mt-3 text-2xl font-bold">
            {text.order} {String(order.order_number ?? order.id)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {text.status}: {statusLabel(order.calculated_status)} - {text.cod}
          </p>
        </div>
        {admin ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            {text.adminAllRoles}
          </span>
        ) : null}
      </header>

      {error ? (
        <p className="mb-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      <OrderSummary
        order={order}
        buyerAddress={buyerLocation.address}
        buyerPhone={buyerLocation.phone}
        currency={currency}
        hasPendingShippingQuote={
          details.shippingQuotes.some((quote) =>
            ["requested", "pending_buyer", "rejected"].includes(
              String(quote.status),
            ),
          ) ||
          details.deliveryPlans.some((plan) =>
            ["collecting_quotes", "pending_buyer", "reprice_required"].includes(
              String(plan.status),
            ),
          )
        }
      />

      {details.deliveryPlans[0] ? (
        <UnifiedDeliveryPlanPanel
          plan={details.deliveryPlans[0]}
          details={details}
          sessionUid={session.uid}
          currency={currency}
          admin={admin}
          isBuyer={isBuyer}
          busyAction={busyAction}
          runAction={runAction}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          {details.sellerOrders.map((sellerOrder) => (
            <SellerOrderCard
              key={String(sellerOrder.id)}
              sellerOrder={sellerOrder}
              details={details}
              sessionUid={session.uid}
              currency={currency}
              admin={admin}
              isBuyer={isBuyer}
              busyAction={busyAction}
              runAction={runAction}
            />
          ))}
        </section>

        <aside className="space-y-4">
          <OrderLevelActions
            order={order}
            isBuyer={isBuyer}
            canRejectAnyDelivery={canRejectAnyDelivery}
            busyAction={busyAction}
            runAction={runAction}
          />
          <ShipmentsPanel
            details={details}
            sessionUid={session.uid}
            admin={admin}
            busyAction={busyAction}
            runAction={runAction}
          />
          <ReturnsPanel
            details={details}
            sessionUid={session.uid}
            admin={admin}
            busyAction={busyAction}
            runAction={runAction}
          />
          <OrderAuditTrail audit={details.audit} />
        </aside>
      </div>
    </main>
  );
}

function BackToOrders() {
  return (
    <Link
      href="/orders"
      className="inline-flex items-center gap-2 text-sm text-primary"
    >
      <ArrowRight className="h-4 w-4" />
      {text.back}
    </Link>
  );
}

function OrderSummary({
  order,
  buyerAddress,
  buyerPhone,
  currency,
  hasPendingShippingQuote,
}: {
  order: DbRow;
  buyerAddress: string;
  buyerPhone: string;
  currency: string;
  hasPendingShippingQuote: boolean;
}) {
  return (
    <section className="mb-5 grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">{text.total}</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(order.grand_total, currency)}
        </p>
        {hasPendingShippingQuote ? (
          <p className="mt-2 text-xs leading-5 text-warning">
            الإجمالي مبدئي حتى قبول عرض الشحن حسب المكان.
          </p>
        ) : null}
      </div>
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">{text.remaining}</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(order.remaining_total, currency)}
        </p>
      </div>
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">{text.buyerAddress}</p>
        <p className="mt-1 text-sm font-semibold">
          {buyerAddress || text.noAddress}
        </p>
        {buyerPhone ? (
          <p className="mt-1 text-xs text-muted-foreground">{buyerPhone}</p>
        ) : null}
      </div>
    </section>
  );
}

function UnifiedDeliveryPlanPanel({
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

  const statusText: Record<string, string> = {
    collecting_quotes: "نجمع عروض مقدمي التوصيل",
    pending_buyer: "توجد عروض بانتظار قرار المشتري",
    accepted: "تم اختيار عرض التوصيل الموحّد",
    reprice_required: "تغيرت محطات الاستلام ويجب إرسال عرض جديد",
    separate_selected: "اختار المشتري التوصيل المنفصل",
    cancelled: "أُلغيت خطة التوصيل",
    completed: "أُنشئت شحنة التوصيل الموحّد",
  };

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
              {statusText[String(plan.status)] ?? String(plan.status)}
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
        <div className="grid gap-3 border-t border-primary/15 p-4 sm:grid-cols-2 lg:grid-cols-[160px_160px_1fr_auto] lg:items-end">
          <label className="space-y-1 text-xs font-semibold">
            قيمة التوصيل
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={baseAmount}
              onChange={(event) => setBaseAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
          {candidateRequiresSpecialVehicle ? (
            <label className="space-y-1 text-xs font-semibold">
              سيارة النقل مرة واحدة
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={vehicleAmount}
                onChange={(event) => setVehicleAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          ) : null}
          <label className="space-y-1 text-xs font-semibold">
            تفاصيل المسار والمدة
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="عدد محطات الاستلام والمدة المتوقعة"
            />
          </label>
          <button
            type="button"
            disabled={!validQuote || sending || Boolean(busyAction)}
            onClick={() =>
              runAction("provider_send_unified_delivery_quote", {
                deliveryPlanId: planId,
                shippingPriceMinor: baseMinor,
                specialVehicleFeeMinor: vehicleMinor,
                notes,
              })
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال العرض
          </button>
        </div>
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

function deliveryStopAddress(snapshot: unknown) {
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

function SellerOrderCard({
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

function ShippingQuotePanel({
  sellerOrderId,
  quotes,
  currency,
  canPropose,
  isBuyer,
  busyAction,
  runAction,
}: {
  sellerOrderId: string;
  quotes: DbRow[];
  currency: string;
  canPropose: boolean;
  isBuyer: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  const latest = [...quotes].sort(
    (left, right) => Number(right.version ?? 0) - Number(left.version ?? 0),
  )[0];
  const status = String(latest?.status ?? "requested");
  const canSend =
    canPropose && ["requested", "rejected", "expired"].includes(status);
  const canRespond = isBuyer && status === "pending_buyer";
  const [amount, setAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const amountMinor = Math.round(Number(amount) * 100);
  const validAmount = Number.isSafeInteger(amountMinor) && amountMinor >= 0;
  const sending = busyAction.startsWith("seller_send_shipping_quote:");

  const statusText: Record<string, string> = {
    requested: "بانتظار تحديد قيمة الشحن",
    pending_buyer: "بانتظار موافقة المشتري",
    accepted: "اعتمد المشتري عرض الشحن",
    rejected: "رفض المشتري العرض ويمكن إرسال قيمة معدلة",
    expired: "انتهت صلاحية العرض ويمكن إرسال قيمة جديدة",
    cancelled: "أُلغي عرض الشحن",
  };

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-primary/25 bg-primary/5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold">عرض الشحن حسب المكان</h3>
            <p className="text-xs text-muted-foreground">
              الإصدار {String(latest.version ?? 1)} ·{" "}
              {statusText[status] ?? status}
            </p>
          </div>
        </div>
        {status === "accepted" ? (
          <CheckCircle2 className="h-6 w-6 text-success" />
        ) : status === "rejected" ? (
          <XCircle className="h-6 w-6 text-error" />
        ) : (
          <CircleDollarSign className="h-6 w-6 text-primary" />
        )}
      </div>

      {status !== "requested" ? (
        <div className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-3">
          <QuoteAmount
            label="الشحن الأساسي"
            value={latest.base_shipping_price}
            currency={currency}
          />
          <QuoteAmount
            label="سيارة النقل عند الحاجة"
            value={latest.special_vehicle_fee}
            currency={currency}
          />
          <QuoteAmount
            label="إجمالي العرض"
            value={latest.total_shipping_price}
            currency={currency}
            emphasized
          />
          {latest.notes ? (
            <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-5 text-muted-foreground sm:col-span-3">
              {String(latest.notes)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="px-3 py-3 text-sm leading-6 text-muted-foreground">
          تُراجع وجهة المشتري أولًا، ثم تُرسل قيمة الشحن. لا تُضاف القيمة إلى
          إجمالي الطلب إلا بعد موافقة المشتري.
        </p>
      )}

      {canSend ? (
        <div className="grid gap-3 border-t border-primary/15 px-3 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <label className="space-y-1 text-xs font-semibold">
            قيمة الشحن الأساسية بالجنيه
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold">
            توضيح اختياري للمشتري
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="المسافة أو طريقة التوصيل أو مدة الوصول"
            />
          </label>
          <button
            type="button"
            disabled={!validAmount || sending || Boolean(busyAction)}
            onClick={() =>
              runAction("seller_send_shipping_quote", {
                sellerOrderId,
                shippingPriceMinor: amountMinor,
                notes,
              })
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال العرض
          </button>
        </div>
      ) : null}

      {canRespond ? (
        <div className="flex flex-wrap gap-2 border-t border-primary/15 px-3 py-3">
          <OrderActionButton
            action="buyer_accept_shipping_quote"
            busyAction={busyAction}
            id={String(latest.id)}
            onClick={() =>
              runAction("buyer_accept_shipping_quote", {
                shippingQuoteId: String(latest.id),
              })
            }
          />
          <OrderActionButton
            action="buyer_reject_shipping_quote"
            busyAction={busyAction}
            id={String(latest.id)}
            tone="danger"
            onClick={() =>
              runAction("buyer_reject_shipping_quote", {
                shippingQuoteId: String(latest.id),
              })
            }
          />
        </div>
      ) : null}
    </section>
  );
}

function QuoteAmount({
  label,
  value,
  currency,
  emphasized = false,
}: {
  label: string;
  value: unknown;
  currency: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-lg bg-surface px-3 py-2 ${emphasized ? "ring-1 ring-primary/30" : ""}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 ${emphasized ? "font-bold text-primary" : "font-semibold"}`}
      >
        {formatMoney(value, currency)}
      </p>
    </div>
  );
}

function CustomRequestRow({
  item,
  isSeller,
  isBuyer,
  currency,
  busyAction,
  runAction,
}: {
  item: DbRow;
  isSeller: boolean;
  isBuyer: boolean;
  currency: string;
  busyAction: string;
  runAction: RunAction;
}) {
  const itemId = String(item.id);
  return (
    <div className="rounded-xl border border-outline-variant bg-background p-3">
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
          <PackageCheck className="h-7 w-7 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">
                {String(item.title ?? "طلب خاص")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {text.itemStatus}: {statusLabel(item.status)}
              </p>
              {item.buyer_description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {String(item.buyer_description)}
                </p>
              ) : null}
            </div>
            <p className="font-bold">
              {formatMoney(item.total_price, currency)}
            </p>
          </div>
          <CustomRequestActions
            item={item}
            itemId={itemId}
            isSeller={isSeller}
            isBuyer={isBuyer}
            busyAction={busyAction}
            runAction={runAction}
          />
        </div>
      </div>
    </div>
  );
}

function CustomRequestActions({
  item,
  itemId,
  isSeller,
  isBuyer,
  busyAction,
  runAction,
}: {
  item: DbRow;
  itemId: string;
  isSeller: boolean;
  isBuyer: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  const sendPrice = () => {
    const value = window.prompt("اكتب السعر بالجنيه المصري");
    if (!value) return;
    const amount = Math.round(Number(value) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    runAction("seller_send_custom_price_offer", {
      customItemId: itemId,
      priceMinor: amount,
    });
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {isSeller && isPendingSellerResponse(item.status) ? (
        <>
          <OrderActionButton
            action="seller_accept_custom_request"
            busyAction={busyAction}
            id={itemId}
            onClick={() =>
              runAction("seller_accept_custom_request", {
                customItemId: itemId,
              })
            }
          />
          <OrderActionButton
            action="seller_reject_custom_request"
            busyAction={busyAction}
            id={itemId}
            tone="danger"
            onClick={() =>
              runAction("seller_reject_custom_request", {
                customItemId: itemId,
              })
            }
          />
        </>
      ) : null}
      {isSeller && item.status === "waiting_for_pricing" ? (
        <OrderActionButton
          action="seller_send_custom_price_offer"
          busyAction={busyAction}
          id={itemId}
          onClick={sendPrice}
        />
      ) : null}
      {isBuyer && item.status === "price_offer_sent" ? (
        <>
          <OrderActionButton
            action="buyer_accept_custom_price"
            busyAction={busyAction}
            id={itemId}
            onClick={() =>
              runAction("buyer_accept_custom_price", { customItemId: itemId })
            }
          />
          <OrderActionButton
            action="buyer_reject_custom_price"
            busyAction={busyAction}
            id={itemId}
            tone="danger"
            onClick={() =>
              runAction("buyer_reject_custom_price", { customItemId: itemId })
            }
          />
        </>
      ) : null}
      {isBuyer && canCancelStatus(item.status) ? (
        <OrderActionButton
          action="buyer_cancel_custom_request"
          busyAction={busyAction}
          id={itemId}
          tone="danger"
          onClick={() =>
            runAction("buyer_cancel_custom_request", { customItemId: itemId })
          }
        />
      ) : null}
    </div>
  );
}

function ProfileLinks({
  sellerId,
  carrierId,
}: {
  sellerId: string;
  carrierId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/profile?mode=view&uid=${encodeURIComponent(sellerId)}`}
        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
      >
        <ExternalLink className="h-4 w-4" />
        {text.sellerProfile}
      </Link>
      {carrierId ? (
        <Link
          href={`/profile?mode=view&uid=${encodeURIComponent(carrierId)}`}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
        >
          <Truck className="h-4 w-4" />
          {text.carrierProfile}
        </Link>
      ) : null}
    </div>
  );
}

function OrderItemRow({
  item,
  isSeller,
  isBuyer,
  currency,
  busyAction,
  runAction,
}: {
  item: DbRow;
  isSeller: boolean;
  isBuyer: boolean;
  currency: string;
  busyAction: string;
  runAction: RunAction;
}) {
  const itemId = String(item.id);
  return (
    <div className="rounded-xl border border-outline-variant bg-background p-3">
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.product_image_snapshot ? (
            <Image
              src={String(item.product_image_snapshot)}
              alt={String(item.product_name_snapshot ?? "")}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <PackageCheck className="m-5 h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">
                {String(item.product_name_snapshot ?? text.product)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {text.quantity}: {String(item.quantity ?? 1)} -{" "}
                {text.itemStatus}: {statusLabel(item.status)}
              </p>
            </div>
            <p className="font-bold">
              {formatMoney(item.total_price, currency)}
            </p>
          </div>
          <ItemActions
            item={item}
            itemId={itemId}
            isSeller={isSeller}
            isBuyer={isBuyer}
            busyAction={busyAction}
            runAction={runAction}
          />
        </div>
      </div>
    </div>
  );
}

function ItemActions({
  item,
  itemId,
  isSeller,
  isBuyer,
  busyAction,
  runAction,
}: {
  item: DbRow;
  itemId: string;
  isSeller: boolean;
  isBuyer: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {isSeller && isPendingSellerResponse(item.status) ? (
        <>
          <OrderActionButton
            action="seller_accept_item"
            busyAction={busyAction}
            id={itemId}
            onClick={() => runAction("seller_accept_item", { itemId })}
          />
          <OrderActionButton
            action="seller_reject_item"
            busyAction={busyAction}
            id={itemId}
            tone="danger"
            onClick={() => runAction("seller_reject_item", { itemId })}
          />
        </>
      ) : null}
      {isSeller && item.status === "seller_accepted" ? (
        <OrderActionButton
          action="seller_prepare_item"
          busyAction={busyAction}
          id={itemId}
          onClick={() => runAction("seller_prepare_item", { itemId })}
        />
      ) : null}
      {isSeller && item.status === "preparing" ? (
        <OrderActionButton
          action="seller_ready_item"
          busyAction={busyAction}
          id={itemId}
          onClick={() => runAction("seller_ready_item", { itemId })}
        />
      ) : null}
      {isBuyer && canCancelStatus(item.status) ? (
        <OrderActionButton
          action="buyer_cancel_item"
          busyAction={busyAction}
          id={itemId}
          tone="danger"
          onClick={() => runAction("buyer_cancel_item", { itemId })}
        />
      ) : null}
      {isBuyer && canRejectDeliveryStatus(item.status) ? (
        <OrderActionButton
          action="buyer_reject_delivery_item"
          busyAction={busyAction}
          id={itemId}
          tone="danger"
          onClick={() => runAction("buyer_reject_delivery_item", { itemId })}
        />
      ) : null}
      {isBuyer && canRequestReturnStatus(item.status) ? (
        <OrderActionButton
          action="buyer_request_return_item"
          busyAction={busyAction}
          id={itemId}
          tone="danger"
          onClick={() => runAction("buyer_request_return_item", { itemId })}
        />
      ) : null}
    </div>
  );
}

function OrderLevelActions({
  order,
  isBuyer,
  canRejectAnyDelivery,
  busyAction,
  runAction,
}: {
  order: DbRow;
  isBuyer: boolean;
  canRejectAnyDelivery: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 className="font-bold">{text.orderActions}</h2>
      <div className="mt-3 space-y-2">
        {isBuyer && canCancelStatus(order.calculated_status) ? (
          <OrderActionButton
            action="buyer_cancel_order"
            busyAction={busyAction}
            id={String(order.id)}
            tone="danger"
            full
            onClick={() => runAction("buyer_cancel_order", {})}
          />
        ) : null}
        {isBuyer && canRejectAnyDelivery ? (
          <OrderActionButton
            action="buyer_reject_delivery_order"
            busyAction={busyAction}
            id={String(order.id)}
            tone="danger"
            full
            onClick={() => runAction("buyer_reject_delivery_order", {})}
          />
        ) : null}
      </div>
    </section>
  );
}

function ShipmentsPanel({
  details,
  sessionUid,
  admin,
  busyAction,
  runAction,
}: {
  details: OrderDetails;
  sessionUid: string;
  admin: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 className="font-bold">{text.shipments}</h2>
      {details.shipments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{text.noShipments}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {details.shipments.map((shipment) => (
            <ShipmentCard
              key={String(shipment.id)}
              shipment={shipment}
              details={details}
              sessionUid={sessionUid}
              admin={admin}
              busyAction={busyAction}
              runAction={runAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ShipmentCard({
  shipment,
  details,
  sessionUid,
  admin,
  busyAction,
  runAction,
}: {
  shipment: DbRow;
  details: OrderDetails;
  sessionUid: string;
  admin: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  const shipmentId = String(shipment.id);
  const carrierId = String(shipment.carrier_id ?? "");
  const shipmentStatus = String(shipment.status ?? "");
  const isCarrier = admin || sessionUid === carrierId;
  const shipmentItems = details.shipmentItems.filter(
    (item) => String(item.shipment_id) === shipmentId,
  );
  const canReceive = [
    "waiting_for_carrier_pickup",
    "partially_received_by_carrier",
  ].includes(shipmentStatus);
  const canReject = [
    "waiting_for_carrier_pickup",
    "partially_received_by_carrier",
  ].includes(shipmentStatus);
  const canTransit = [
    "waiting_for_carrier_pickup",
    "fully_received_by_carrier",
    "partially_received_by_carrier",
  ].includes(shipmentStatus);
  const canOutForDelivery = [
    "in_transit",
    "arrived_at_distribution_center",
  ].includes(shipmentStatus);
  const canDeliver = [
    "in_transit",
    "out_for_delivery",
    "partially_delivered",
  ].includes(shipmentStatus);

  return (
    <div className="rounded-lg border border-outline-variant p-3">
      <p className="text-sm font-semibold">{statusLabel(shipment.status)}</p>
      <p className="text-xs text-muted-foreground">
        {text.carrierCompany}:{" "}
        {profileName(details.profiles[carrierId], carrierId || text.unknown)}
      </p>
      {isCarrier ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {canReceive ? (
            <OrderActionButton
              action="carrier_receive_shipment"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() =>
                runAction("carrier_receive_shipment", { shipmentId })
              }
            />
          ) : null}
          {canReject ? (
            <OrderActionButton
              action="carrier_reject_shipment"
              busyAction={busyAction}
              id={shipmentId}
              tone="danger"
              onClick={() =>
                runAction("carrier_reject_shipment", { shipmentId })
              }
            />
          ) : null}
          {canTransit ? (
            <OrderActionButton
              action="carrier_in_transit"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() => runAction("carrier_in_transit", { shipmentId })}
            />
          ) : null}
          {canOutForDelivery ? (
            <OrderActionButton
              action="carrier_out_for_delivery"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() =>
                runAction("carrier_out_for_delivery", { shipmentId })
              }
            />
          ) : null}
          {canDeliver ? (
            <OrderActionButton
              action="carrier_delivered"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() => runAction("carrier_delivered", { shipmentId })}
            />
          ) : null}
        </div>
      ) : null}
      {shipmentItems.length > 0 ? (
        <div className="mt-3 border-t border-outline-variant pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {text.shipmentItems}
          </p>
          <div className="space-y-2">
            {shipmentItems.map((shipmentItem) => (
              <ShipmentItemRow
                key={String(shipmentItem.id)}
                shipmentItem={shipmentItem}
                details={details}
                isCarrier={isCarrier}
                busyAction={busyAction}
                runAction={runAction}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShipmentItemRow({
  shipmentItem,
  details,
  isCarrier,
  busyAction,
  runAction,
}: {
  shipmentItem: DbRow;
  details: OrderDetails;
  isCarrier: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  const shipmentItemId = String(shipmentItem.id);
  const orderItem = details.orderItems.find(
    (item) => String(item.id) === String(shipmentItem.order_item_id),
  );
  const title = String(orderItem?.product_name_snapshot ?? text.product);
  return (
    <div className="rounded-lg bg-background p-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {text.quantity}: {String(shipmentItem.quantity ?? 1)} -{" "}
            {statusLabel(shipmentItem.status)}
          </p>
        </div>
        {isCarrier && canDeliverShipmentItemStatus(shipmentItem.status) ? (
          <OrderActionButton
            action="carrier_deliver_shipment_item"
            busyAction={busyAction}
            id={shipmentItemId}
            onClick={() =>
              runAction("carrier_deliver_shipment_item", { shipmentItemId })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function ReturnsPanel({
  details,
  sessionUid,
  admin,
  busyAction,
  runAction,
}: {
  details: OrderDetails;
  sessionUid: string;
  admin: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 className="font-bold">{text.returns}</h2>
      {details.returns.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{text.noReturns}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {details.returns.map((returnRequest) => {
            const requestItems = details.returnItems.filter(
              (item) =>
                String(item.return_request_id) === String(returnRequest.id),
            );
            const firstOrderItem = details.orderItems.find((orderItem) =>
              requestItems.some(
                (item) => String(item.order_item_id) === String(orderItem.id),
              ),
            );
            const sellerOrder = details.sellerOrders.find(
              (order) =>
                String(order.id) === String(returnRequest.seller_order_id) ||
                String(order.id) === String(firstOrderItem?.seller_order_id),
            );
            const isSeller =
              admin ||
              (sellerOrder && sessionUid === String(sellerOrder.seller_id));
            const returnRequestId = String(returnRequest.id);
            const canDecide =
              isSeller && String(returnRequest.status) === "requested";
            return (
              <div
                key={returnRequestId}
                className="rounded-lg border border-outline-variant p-3 text-sm"
              >
                <p className="font-semibold">
                  {text.returnStatus}: {statusLabel(returnRequest.status)}
                </p>
                {returnRequest.reason ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {text.returnReason}: {String(returnRequest.reason)}
                  </p>
                ) : null}
                {requestItems.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {requestItems.map((requestItem) => {
                      const orderItem = details.orderItems.find(
                        (item) =>
                          String(item.id) === String(requestItem.order_item_id),
                      );
                      return (
                        <p
                          key={String(requestItem.id)}
                          className="text-xs text-muted-foreground"
                        >
                          {String(
                            orderItem?.product_name_snapshot ?? text.product,
                          )}{" "}
                          - {text.quantity}: {String(requestItem.quantity ?? 1)}
                        </p>
                      );
                    })}
                  </div>
                ) : null}
                {canDecide ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <OrderActionButton
                      action="seller_approve_return"
                      busyAction={busyAction}
                      id={returnRequestId}
                      onClick={() =>
                        runAction("seller_approve_return", { returnRequestId })
                      }
                    />
                    <OrderActionButton
                      action="seller_reject_return"
                      busyAction={busyAction}
                      id={returnRequestId}
                      tone="danger"
                      onClick={() =>
                        runAction("seller_reject_return", { returnRequestId })
                      }
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
