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
import { uiAttributes } from "@asol/ui-registry-core";

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
      <main {...uiAttributes({ uid: "orders.orders-page-content.main.4-e4eE4k", id: "orders.orders-page-content.main.4" })} id="orders.orders-page-content.main" className="flex min-h-[50vh] items-center justify-center">
        <Loader2 id="orders.orders-page-content.loader2" className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!session?.uid) {
    return (
      <main {...uiAttributes({ uid: "orders.orders-page-content.main.5-7GY2gF", id: "orders.orders-page-content.main.5" })} id="orders.orders-page-content.main.2" className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h1 {...uiAttributes({ uid: "orders.orders-page-content.h1.3-Z7pA64", id: "orders.orders-page-content.h1.3" })} id="orders.orders-page-content.h1" className="text-2xl font-bold">{copy.title}</h1>
        <p {...uiAttributes({ uid: "orders.orders-page-content.p.5-LEF3h2", id: "orders.orders-page-content.p.5" })} id="orders.orders-page-content.p" className="mt-3 text-muted-foreground">{copy.login}</p>
      </main>
    );
  }

  return (
    <main {...uiAttributes({ uid: "orders.orders-page-content.main.6-mpm7NG", id: "orders.orders-page-content.main.6" })} id="orders.orders-page-content.main.3" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div {...uiAttributes({ uid: "orders.orders-page-content.div.5-9jFEE8", id: "orders.orders-page-content.div.5" })} id="orders.orders-page-content.div" className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div {...uiAttributes({ uid: "orders.orders-page-content.div.6-GrF97B", id: "orders.orders-page-content.div.6" })} id="orders.orders-page-content.div.2">
          <h1 {...uiAttributes({ uid: "orders.orders-page-content.h1.4-LP9PNt", id: "orders.orders-page-content.h1.4" })} id="orders.orders-page-content.h1.2" className="text-2xl font-bold">{copy.title}</h1>
          <p {...uiAttributes({ uid: "orders.orders-page-content.p.6-OP0BXZ", id: "orders.orders-page-content.p.6" })} id="orders.orders-page-content.p.2" className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        {admin ? (
          <span {...uiAttributes({ uid: "orders.orders-page-content.span.2-r2Qz03", id: "orders.orders-page-content.span.2" })} id="orders.orders-page-content.span" className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <ShieldCheck id="orders.orders-page-content.shield-check" className="h-4 w-4" />
            {copy.admin}
          </span>
        ) : null}
      </div>

      {error ? (
        <p {...uiAttributes({ uid: "orders.orders-page-content.p.7-2b4IqD", id: "orders.orders-page-content.p.7" })} id="orders.orders-page-content.p.3" className="mb-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div {...uiAttributes({ uid: "orders.orders-page-content.div.7-8qI4TH", id: "orders.orders-page-content.div.7" })} id="orders.orders-page-content.div.3" className="flex min-h-[30vh] items-center justify-center">
          <Loader2 id="orders.orders-page-content.loader2.2" className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <section {...uiAttributes({ uid: "orders-empty-ib4VM2", id: "orders-empty", kind: "region", simulation: { kind: "state", id: "orders-empty" } })} className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <ClipboardList id="orders.orders-page-content.clipboard-list" className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 {...uiAttributes({ uid: "orders.orders-page-content.h2.2-Nxs3cr", id: "orders.orders-page-content.h2.2" })} id="orders.orders-page-content.h2" className="mt-4 text-lg font-bold">{copy.emptyTitle}</h2>
          <p {...uiAttributes({ uid: "orders.orders-page-content.p.8-3wTN2Y", id: "orders.orders-page-content.p.8" })} id="orders.orders-page-content.p.4" className="mt-2 text-sm text-muted-foreground">
            {copy.emptyDescription}
          </p>
        </section>
      ) : (
        <>
          <section {...uiAttributes({ uid: "orders.orders-page-content.section.2-3FJI3J", id: "orders.orders-page-content.section.2" })} id="orders.orders-page-content.section" className="grid gap-4 md:grid-cols-2">
            {items.map(({ order, viewerRoles }) => {
              const id = String(order.id);
              const detailRole = primaryViewerRole(viewerRoles, admin);
              return (
                <Link key={id}
                  {...uiAttributes({ uid: "orders-open-0xH8x3", id: "orders-open", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "orders-open" } })}
                  href={`/orders/details?orderId=${encodeURIComponent(id)}&role=${detailRole}`}
                  className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm transition"
                >
                  <div {...uiAttributes({ uid: "orders.orders-page-content.div.8-aoxS7H", id: "orders.orders-page-content.div.8" })} className="flex items-start justify-between gap-3">
                    <div {...uiAttributes({ uid: "orders.orders-page-content.div.9-CBWX6M", id: "orders.orders-page-content.div.9" })}>
                      <p {...uiAttributes({ uid: "orders.orders-page-content.p.9-1IdtXq", id: "orders.orders-page-content.p.9" })} className="text-xs text-muted-foreground">{copy.orderNumber}</p>
                      <h2 {...uiAttributes({ uid: "orders.orders-page-content.h2.3-4LxI9M", id: "orders.orders-page-content.h2.3" })} className="font-bold">
                        {String(order.order_number ?? id)}
                      </h2>
                      <p {...uiAttributes({ uid: "orders.orders-page-content.p.10-0C6CkF", id: "orders.orders-page-content.p.10" })} className="mt-1 text-xs text-muted-foreground">
                        {copy.orderDate}: {formatOrderDate(order.created_at, locale)}
                      </p>
                    </div>
                    <span {...uiAttributes({ uid: "orders.orders-page-content.span.3-4QJop2", id: "orders.orders-page-content.span.3" })} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {statusLabel(order.calculated_status, locale)}
                    </span>
                  </div>

                  {viewerRoles.length > 0 ? (
                    <div {...uiAttributes({ uid: "orders.orders-page-content.div.10-RAjk3f", id: "orders.orders-page-content.div.10" })} className="mt-3 flex flex-wrap gap-2">
                      <span {...uiAttributes({ uid: "orders.orders-page-content.span.4-Pjv4n2", id: "orders.orders-page-content.span.4" })} className="text-xs text-muted-foreground">
                        {copy.yourRole}:
                      </span>
                      {viewerRoles.map((role) => (
                        <span
                          key={`${id}-${role}`} {...uiAttributes({ uid: "orders.orders-page-content.span.5-Nb6VUo", id: "orders.orders-page-content.span.5" })}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                        >
                          {viewerRoleLabel(role, locale)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div {...uiAttributes({ uid: "orders.orders-page-content.div.11-1KdHHv", id: "orders.orders-page-content.div.11" })} className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div {...uiAttributes({ uid: "orders.orders-page-content.div.12-JyjHE1", id: "orders.orders-page-content.div.12" })}>
                      <p {...uiAttributes({ uid: "orders.orders-page-content.p.11-72d7oT", id: "orders.orders-page-content.p.11" })} className="text-muted-foreground">{copy.total}</p>
                      <p {...uiAttributes({ uid: "orders.orders-page-content.p.12-MzAHD5", id: "orders.orders-page-content.p.12" })} className="font-bold">
                        {formatMoney(
                          order.grand_total,
                          String(order.currency ?? "EGP"),
                          locale,
                        )}
                      </p>
                    </div>
                    <div {...uiAttributes({ uid: "orders.orders-page-content.div.13-YJMSK2", id: "orders.orders-page-content.div.13" })}>
                      <p {...uiAttributes({ uid: "orders.orders-page-content.p.13-AL67Bf", id: "orders.orders-page-content.p.13" })} className="text-muted-foreground">{copy.remaining}</p>
                      <p {...uiAttributes({ uid: "orders.orders-page-content.p.14-2W4SMh", id: "orders.orders-page-content.p.14" })} className="font-bold">
                        {formatMoney(
                          order.remaining_total,
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
            <div {...uiAttributes({ uid: "orders.orders-page-content.div.14-6YW75C", id: "orders.orders-page-content.div.14" })} id="orders.orders-page-content.div.4" className="mt-6 flex justify-center">
              <button {...uiAttributes({ uid: "orders-load-more-ONCD9F", id: "orders-load-more", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "orders-load-more" } })}
                type="button"
                onClick={() => void loadOrders()}
                disabled={loadingMore}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-5 py-2.5 text-sm font-semibold text-on-surface transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 id="orders.orders-page-content.loader2.3" className="h-4 w-4 animate-spin" />
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
