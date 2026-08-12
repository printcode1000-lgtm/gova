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

import { RunAction, text, BackToOrders, OrderSummary } from "./order-details/OrderDetailsPageContent.navigation-summary";
import { UnifiedDeliveryPlanPanel } from "./order-details/OrderDetailsPageContent.delivery-plan";
import { SellerOrderCard } from "./order-details/OrderDetailsPageContent.seller-orders";
import { OrderLevelActions, ShipmentsPanel } from "./order-details/OrderDetailsPageContent.shipments";
import { ReturnsPanel } from "./order-details/OrderDetailsPageContent.returns";

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
