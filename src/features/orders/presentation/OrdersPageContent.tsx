"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Loader2, ShieldCheck } from "lucide-react";

import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { useTranslation } from "@/shared/i18n";
import { useOrdersListAutoRefresh } from "./OrderNotificationsController";
import {
  formatMoney,
  formatOrderDate,
  primaryViewerRole,
  queryForOrderList,
  statusLabel,
  viewerRoleLabel,
} from "./order-labels";
import type { OrderListItem, OrderListResponse } from "./order-types";
import { ordersPageCopy } from "./orders-page-copy";

const PAGE_SIZE = 5;

export function OrdersPageContent() {
  const { session, isLoading: sessionLoading } = useSession();
  const { locale, formatApiError } = useTranslation();
  const copy = ordersPageCopy(locale);
  const admin = isSuperAdmin(session);
  const [items, setItems] = React.useState<OrderListItem[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const itemsLengthRef = React.useRef(0);
  itemsLengthRef.current = items.length;

  const loadOrders = React.useCallback(
    async (reset = false) => {
      if (!session?.uid) return;
      const offset = reset ? 0 : itemsLengthRef.current;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        const route = `${ASOL_API_ROUTES.orders.root}?${queryForOrderList(
          session.uid,
          session.phone,
          { limit: PAGE_SIZE, offset },
        )}`;
        const data = await asolApi.get<OrderListResponse>(route);
        setItems((current) => (reset ? data.items : [...current, ...data.items]));
        setHasMore(data.hasMore);
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [formatApiError, session?.phone, session?.uid],
  );

  React.useEffect(() => {
    void loadOrders(true);
  }, [loadOrders]);

  useOrdersListAutoRefresh(() => loadOrders(true), session?.uid);

  if (sessionLoading) {
    return (
      <main id='features-orders-presentation-orderspagecontent-main-1-wwtzdf' className="flex min-h-[50vh] items-center justify-center">
        <Loader2 id='features-orders-presentation-orderspagecontent-loader2-2-lt0x9p' className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!session?.uid) {
    return (
      <main id='features-orders-presentation-orderspagecontent-main-3-c9dslo' className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h1 id='features-orders-presentation-orderspagecontent-heading-4-tma1gi' className="text-2xl font-bold">{copy.title}</h1>
        <p id='features-orders-presentation-orderspagecontent-text-5-vvqqaq' className="mt-3 text-muted-foreground">{copy.login}</p>
      </main>
    );
  }

  return (
    <main id='features-orders-presentation-orderspagecontent-main-6-h8iowi' className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div id='features-orders-presentation-orderspagecontent-div-7-gouh6i' className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div id='features-orders-presentation-orderspagecontent-div-8-lhvi7z'>
          <h1 id='features-orders-presentation-orderspagecontent-heading-9-b6iutm' className="text-2xl font-bold">{copy.title}</h1>
          <p id='features-orders-presentation-orderspagecontent-text-10-biyyn9' className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        {admin ? (
          <span id='features-orders-presentation-orderspagecontent-text-11-m3wb29' className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <ShieldCheck id='features-orders-presentation-orderspagecontent-shieldcheck-12-q6dv3s' className="h-4 w-4" />
            {copy.admin}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id='features-orders-presentation-orderspagecontent-text-13-8bjetb' className="mb-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div id='features-orders-presentation-orderspagecontent-div-14-lvuspp' className="flex min-h-[30vh] items-center justify-center">
          <Loader2 id='features-orders-presentation-orderspagecontent-loader2-15-ypvofo' className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <section id="features-orders-presentation-orderspagecontent-section-16-mdt1uw" className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <ClipboardList id='features-orders-presentation-orderspagecontent-clipboardlist-17-ytwpht' className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 id='features-orders-presentation-orderspagecontent-heading-18-3vnfww' className="mt-4 text-lg font-bold">{copy.emptyTitle}</h2>
          <p id='features-orders-presentation-orderspagecontent-text-19-u4eeyn' className="mt-2 text-sm text-muted-foreground">
            {copy.emptyDescription}
          </p>
        </section>
      ) : (
        <>
          <section id='features-orders-presentation-orderspagecontent-section-20-rlkmqp' className="grid gap-4 md:grid-cols-2">
            {items.map(({ order, viewerRoles }) => {
              const id = String(order.id);
              const detailRole = primaryViewerRole(viewerRoles, admin);
              return (
                <Link key={id}
                  href={`/orders/details?orderId=${encodeURIComponent(id)}&role=${detailRole}`}
                  className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{copy.orderNumber}</p>
                      <h2 className="font-bold">
                        {String(order.orderNumber ?? id)}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {copy.orderDate}: {formatOrderDate(order.createdAt, locale)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {statusLabel(order.calculatedStatus, locale)}
                    </span>
                  </div>

                  {viewerRoles.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">
                        {copy.yourRole}:
                      </span>
                      {viewerRoles.map((role) => (
                        <span
                          key={`${id}-${role}`}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                        >
                          {viewerRoleLabel(role, locale)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{copy.total}</p>
                      <p className="font-bold">
                        {formatMoney(
                          order.grandTotal,
                          String(order.currency ?? "EGP"),
                          locale,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{copy.remaining}</p>
                      <p className="font-bold">
                        {formatMoney(
                          order.remainingTotal,
                          String(order.currency ?? "EGP"),
                          locale,
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>

          {hasMore ? (
            <div id='features-orders-presentation-orderspagecontent-div-21-wagclb' className="mt-6 flex justify-center">
              <button id="features-orders-presentation-orderspagecontent-button-22-c0vcbz"
                type="button"
                onClick={() => void loadOrders()}
                disabled={loadingMore}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-5 py-2.5 text-sm font-semibold text-on-surface transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 id='features-orders-presentation-orderspagecontent-loader2-23-6h5wto' className="h-4 w-4 animate-spin" />
                    {copy.loadingMore}
                  </>
                ) : (
                  copy.loadMore
                )}
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
