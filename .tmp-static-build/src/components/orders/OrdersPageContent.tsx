"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Loader2, ShieldCheck } from "lucide-react";

import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useTranslation } from "@/lib/i18n";
import {
  formatMoney,
  queryWithActor,
  statusLabel,
} from "./order-labels";
import type { DbRow, OrderRole } from "./order-types";

export function OrdersPageContent() {
  const { session, isLoading: sessionLoading } = useSession();
  const { locale } = useTranslation();
  const copy = locale === "ar"
    ? {
        title: "الطلبات", login: "يجب تسجيل الدخول لعرض الطلبات المرتبطة بك.",
        description: "متابعة الطلبات حسب دورك داخل الطلب: مشتري، بائع، أو مقدم توصيل.",
        admin: "تحكم السوبر أدمن", emptyTitle: "لا توجد طلبات",
        emptyDescription: "عند إنشاء طلب أو ارتباطك بطلب كبائع أو مقدم توصيل سيظهر هنا.",
        orderNumber: "رقم الطلب", total: "الإجمالي", remaining: "المتبقي عند الاستلام",
        loadFailed: "تعذر تحميل الطلبات.",
        roles: { buyer: "كمشتري", seller: "كبائع", service_provider: "كمقدم توصيل" },
      }
    : {
        title: "Orders", login: "Sign in to view orders associated with you.",
        description: "Track orders by your role: buyer, seller, or delivery provider.",
        admin: "Super admin control", emptyTitle: "No orders",
        emptyDescription: "Orders you create or join as a seller or delivery provider will appear here.",
        orderNumber: "Order number", total: "Total", remaining: "Remaining on delivery",
        loadFailed: "Unable to load orders.",
        roles: { buyer: "As buyer", seller: "As seller", service_provider: "As delivery provider" },
      };
  const roleTabs: { role: OrderRole; label: string }[] = [
    { role: "buyer", label: copy.roles.buyer },
    { role: "seller", label: copy.roles.seller },
    { role: "service_provider", label: copy.roles.service_provider },
  ];
  const admin = isSuperAdmin(session);
  const [role, setRole] = React.useState<OrderRole>("buyer");
  const activeRole: OrderRole = admin ? "admin" : role;
  const [orders, setOrders] = React.useState<DbRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!session?.uid) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const route = `${ASOL_API_ROUTES.orders.root}?${queryWithActor(
          session.uid,
          session.phone,
          activeRole,
        )}`;
        const data = await asolApi.get<DbRow[]>(route);
        if (!cancelled) setOrders(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : copy.loadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeRole, copy.loadFailed, session?.phone, session?.uid]);

  if (sessionLoading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!session?.uid) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="mt-3 text-muted-foreground">
          {copy.login}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        {admin ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            {copy.admin}
          </span>
        ) : (
          <div className="inline-flex overflow-hidden rounded-xl border border-outline-variant bg-surface">
            {roleTabs.map((tab) => (
              <button
                key={tab.role}
                type="button"
                onClick={() => setRole(tab.role)}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  role === tab.role
                    ? "bg-primary text-on-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <section className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">{copy.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.emptyDescription}
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => {
            const id = String(order.id);
            return (
              <Link
                key={id}
                href={`/orders/details?orderId=${encodeURIComponent(id)}&role=${activeRole}`}
                className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm transition hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{copy.orderNumber}</p>
                    <h2 className="font-bold">{String(order.order_number ?? id)}</h2>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    {statusLabel(order.calculated_status, locale)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{copy.total}</p>
                    <p className="font-bold">
                      {formatMoney(order.grand_total, String(order.currency ?? "EGP"), locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{copy.remaining}</p>
                    <p className="font-bold">
                      {formatMoney(order.remaining_total, String(order.currency ?? "EGP"), locale)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
