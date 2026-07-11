"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { govaApi } from "@/core/api/gova-api-client";
import { GOVA_API_ROUTES } from "@/core/api/gova-api-routes";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { OrderActionButton } from "./OrderActionButton";
import { OrderAuditTrail } from "./OrderAuditTrail";
import {
  canCancelStatus,
  canRejectDeliveryStatus,
  carrierFromSellerOrder,
  formatMoney,
  profileAddress,
  profileName,
  queryWithActor,
  statusLabel,
} from "./order-labels";
import type { DbRow, OrderDetails, OrderRole } from "./order-types";

type RunAction = (action: string, payload: Record<string, string>) => void;

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
      const route = `${GOVA_API_ROUTES.orders.byId(orderId)}?${queryWithActor(
        session.uid,
        session.phone,
        activeRole,
      )}`;
      setDetails(await govaApi.get<OrderDetails>(route));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الطلب.");
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
      await govaApi.post(GOVA_API_ROUTES.orders.actions(orderId), {
        uid: session.uid,
        phone: session.phone,
        action,
        reason:
          action.includes("cancel") || action.includes("reject")
            ? "تم التنفيذ من صفحة الطلب"
            : undefined,
        ...payload,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تنفيذ الإجراء.");
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
        <h1 className="text-2xl font-bold">تفاصيل الطلب</h1>
        <p className="mt-3 text-muted-foreground">
          يجب تسجيل الدخول لعرض تفاصيل الطلب.
        </p>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <BackToOrders />
        <p className="mt-6 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error || "لم يتم العثور على الطلب."}
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
  const canRejectAnyDelivery = details.orderItems.some((item) =>
    canRejectDeliveryStatus(item.status),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <BackToOrders />
          <h1 className="mt-3 text-2xl font-bold">
            طلب {String(order.order_number ?? order.id)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الحالة: {statusLabel(order.calculated_status)} - الدفع عند الاستلام فقط
          </p>
        </div>
        {admin ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            السوبر أدمن يتحكم بكل الأدوار
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
      />

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
          <OrderAuditTrail audit={details.audit} />
        </aside>
      </div>
    </main>
  );
}

function BackToOrders() {
  return (
    <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-primary">
      <ArrowRight className="h-4 w-4" />
      العودة للطلبات
    </Link>
  );
}

function OrderSummary({
  order,
  buyerAddress,
  buyerPhone,
  currency,
}: {
  order: DbRow;
  buyerAddress: string;
  buyerPhone: string;
  currency: string;
}) {
  return (
    <section className="mb-5 grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">إجمالي الطلب</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(order.grand_total, currency)}
        </p>
      </div>
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">المبلغ المتبقي</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(order.remaining_total, currency)}
        </p>
      </div>
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">عنوان المشتري</p>
        <p className="mt-1 text-sm font-semibold">
          {buyerAddress || "لا يوجد عنوان محفوظ"}
        </p>
        {buyerPhone ? (
          <p className="mt-1 text-xs text-muted-foreground">{buyerPhone}</p>
        ) : null}
      </div>
    </section>
  );
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
  const carrierId = carrierFromSellerOrder(sellerOrder, details.orderItems);
  const sellerItems = details.orderItems.filter(
    (item) => item.seller_order_id === sellerOrder.id,
  );
  const sellerProfile = details.profiles[sellerId];
  const carrierProfile = carrierId ? details.profiles[carrierId] : null;
  const isSeller = admin || sessionUid === sellerId;
  const shipmentExists = details.shipments.some(
    (shipment) => String(shipment.carrier_id ?? "") === carrierId,
  );
  const canRejectSellerDelivery = sellerItems.some((item) =>
    canRejectDeliveryStatus(item.status),
  );

  return (
    <article className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant pb-3">
        <div>
          <h2 className="font-bold">{profileName(sellerProfile, sellerId)}</h2>
          <p className="text-sm text-muted-foreground">
            حالة البائع: {statusLabel(sellerOrder.status)}
          </p>
          {carrierId ? (
            <p className="mt-1 text-sm text-muted-foreground">
              مقدم التوصيل: {profileName(carrierProfile, carrierId)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-error">
              لا يوجد مقدم توصيل مرتبط بهذا البائع.
            </p>
          )}
        </div>
        <ProfileLinks sellerId={sellerId} carrierId={carrierId} />
      </div>

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
        {admin && carrierId && !shipmentExists ? (
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

function ProfileLinks({ sellerId, carrierId }: { sellerId: string; carrierId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/profile?mode=view&uid=${encodeURIComponent(sellerId)}`}
        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
      >
        <ExternalLink className="h-4 w-4" />
        بروفايل البائع
      </Link>
      {carrierId ? (
        <Link
          href={`/profile?mode=view&uid=${encodeURIComponent(carrierId)}`}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
        >
          <Truck className="h-4 w-4" />
          بروفايل التوصيل
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
                {String(item.product_name_snapshot ?? "منتج")}
              </h3>
              <p className="text-xs text-muted-foreground">
                الكمية: {String(item.quantity ?? 1)} - الحالة:{" "}
                {statusLabel(item.status)}
              </p>
            </div>
            <p className="font-bold">{formatMoney(item.total_price, currency)}</p>
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
      {isSeller && item.status === "new" ? (
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
      <h2 className="font-bold">إجراءات الطلب</h2>
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
      <h2 className="font-bold">الشحنات</h2>
      {details.shipments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          لم يتم إنشاء شحنات بعد.
        </p>
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
  const isCarrier = admin || sessionUid === carrierId;

  return (
    <div className="rounded-lg border border-outline-variant p-3">
      <p className="text-sm font-semibold">{statusLabel(shipment.status)}</p>
      <p className="text-xs text-muted-foreground">
        شركة التوصيل:{" "}
        {profileName(details.profiles[carrierId], carrierId || "غير محدد")}
      </p>
      {isCarrier ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <OrderActionButton
            action="carrier_receive_shipment"
            busyAction={busyAction}
            id={shipmentId}
            onClick={() => runAction("carrier_receive_shipment", { shipmentId })}
          />
          <OrderActionButton
            action="carrier_reject_shipment"
            busyAction={busyAction}
            id={shipmentId}
            tone="danger"
            onClick={() => runAction("carrier_reject_shipment", { shipmentId })}
          />
          <OrderActionButton
            action="carrier_in_transit"
            busyAction={busyAction}
            id={shipmentId}
            onClick={() => runAction("carrier_in_transit", { shipmentId })}
          />
          <OrderActionButton
            action="carrier_out_for_delivery"
            busyAction={busyAction}
            id={shipmentId}
            onClick={() => runAction("carrier_out_for_delivery", { shipmentId })}
          />
          <OrderActionButton
            action="carrier_delivered"
            busyAction={busyAction}
            id={shipmentId}
            onClick={() => runAction("carrier_delivered", { shipmentId })}
          />
        </div>
      ) : null}
    </div>
  );
}
