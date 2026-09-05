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
import { OrderActionButton } from "./OrderActionButton";
import { OrderAuditTrail } from "./OrderAuditTrail";
import {
  canCancelStatus,
  canDeliverShipmentItemStatus,
  canRejectDeliveryStatus,
  canRequestReturnStatus,
  carrierFromSellerOrder,
  formatMoney,
  profileName,
  queryWithActor,
  resolveBuyerDeliveryDisplay,
  statusLabel,
} from "./order-labels";
import type { OrderDetails, OrderRole } from "./order-types";

import { RunAction, text, BackToOrders, OrderSummary } from "./order-details/OrderDetailsPageContent.navigation-summary";
import { useTranslation } from "@/shared/i18n";
import { UnifiedDeliveryPlanPanel } from "./order-details/OrderDetailsPageContent.delivery-plan";
import { SellerOrderCard } from "./order-details/OrderDetailsPageContent.seller-orders";
import { OrderLevelActions, ShipmentsPanel } from "./order-details/OrderDetailsPageContent.shipments";
import { ReturnsPanel } from "./order-details/OrderDetailsPageContent.returns";
import { BuyerDeliveryAddressPanel } from "./order-details/OrderDetailsPageContent.buyer-delivery";
import { useOrderDetailsAutoRefresh } from "./OrderNotificationsController";

export function OrderDetailsPageContent({ id, orderId }: { orderId: string } & { id?: string }) {
  const { formatApiError } = useTranslation();
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
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [activeRole, formatApiError, orderId, session?.phone, session?.uid]);

  React.useEffect(() => {
    void load();
  }, [load]);

  useOrderDetailsAutoRefresh(orderId, load, session?.uid);

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
      setError(formatApiError(err));
    } finally {
      setBusyAction("");
    }
  };

  if (sessionLoading || loading) {
    return (
      <main id={id} className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!session?.uid) {
    return (
      <main id={id} className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h1 id="features-orders-presentation-orderdetailspagecontent-heading-3-es1b4l" className="text-2xl font-bold">{text.detailsTitle}</h1>
        <p id="features-orders-presentation-orderdetailspagecontent-text-4-wz8k3y" className="mt-3 text-muted-foreground">{text.loginRequired}</p>
      </main>
    );
  }

  if (!details) {
    return (
      <main id="features-orders-presentation-orderdetailspagecontent-main-5-utgtxy" className="mx-auto max-w-4xl px-4 py-10">
        <BackToOrders />
        <p id="features-orders-presentation-orderdetailspagecontent-text-6-xum2ed" className="mt-6 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error || text.notFound}
        </p>
      </main>
    );
  }

  const order = details.order;
  const buyerId = String(order.buyerId ?? "");
  const buyer = details.profiles[buyerId];
  const buyerLocation = resolveBuyerDeliveryDisplay(order, buyer);
  const currency = String(order.currency ?? "EGP");
  const isBuyer = admin || session.uid === buyerId;
  const canRejectAnyDelivery = [
    ...details.orderItems,
    ...details.customItems,
  ].some((item) => canRejectDeliveryStatus(item.status));

  return (
    <main id={id} className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header id="features-orders-presentation-orderdetailspagecontent-header-8-rxzz11" className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div id="features-orders-presentation-orderdetailspagecontent-div-9-hufad4">
          <BackToOrders />
          <h1 id="features-orders-presentation-orderdetailspagecontent-heading-10-giiyco" className="mt-3 text-2xl font-bold">
            {text.order} {String(order.orderNumber ?? order.id)}
          </h1>
          <p id="features-orders-presentation-orderdetailspagecontent-text-11-0emeve" className="mt-1 text-sm text-muted-foreground">
            {text.status}: {statusLabel(order.calculatedStatus)} - {text.cod}
          </p>
        </div>
        {admin ? (
          <span id="features-orders-presentation-orderdetailspagecontent-text-12-5jqeee" className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            {text.adminAllRoles}
          </span>
        ) : null}
      </header>

      {error ? (
        <p id="features-orders-presentation-orderdetailspagecontent-text-13-eecr7c" className="mb-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      {isBuyer ? (
        <BuyerDeliveryAddressPanel
          order={order}
          orderId={orderId}
          busyAction={busyAction}
          runAction={runAction}
        />
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

      <div id="features-orders-presentation-orderdetailspagecontent-div-14-qjtp7g" className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section id="features-orders-presentation-orderdetailspagecontent-section-15-8tqkhr" className="space-y-4">
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

        <aside id="features-orders-presentation-orderdetailspagecontent-aside-16-qd57yv" className="space-y-4">
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
