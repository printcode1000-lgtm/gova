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
import { CustomRequestRow } from "./OrderDetailsPageContent.custom-request-row";
import { uiAttributes } from "@asol/ui-registry-core";

export function ShippingQuotePanel({ id,
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
} & { id?: string }) {
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
    <section {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.section-F5Ft98", id: "orders.order-details.order-details-page-content.shipping-quotes.section" })} id={id} className="mt-4 overflow-hidden rounded-xl border border-primary/25 bg-primary/5">
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.div-y9TGg2", id: "orders.order-details.order-details-page-content.shipping-quotes.div" })} className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 px-3 py-3">
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.div.2-Djl8wQ", id: "orders.order-details.order-details-page-content.shipping-quotes.div.2" })} className="flex items-center gap-2">
          <span {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.span-S597Iz", id: "orders.order-details.order-details-page-content.shipping-quotes.span" })} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.div.3-1NEX4P", id: "orders.order-details.order-details-page-content.shipping-quotes.div.3" })}>
            <h3 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.h3-2T1zxJ", id: "orders.order-details.order-details-page-content.shipping-quotes.h3" })} className="text-sm font-bold">عرض الشحن حسب المكان</h3>
            <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.p-10HJt0", id: "orders.order-details.order-details-page-content.shipping-quotes.p" })} className="text-xs text-muted-foreground">
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
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.div.4-oUq8jm", id: "orders.order-details.order-details-page-content.shipping-quotes.div.4" })} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-3">
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
            <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.p.2-Jg8H17", id: "orders.order-details.order-details-page-content.shipping-quotes.p.2" })} className="rounded-lg bg-surface px-3 py-2 text-xs leading-5 text-muted-foreground sm:col-span-3">
              {String(latest.notes)}
            </p>
          ) : null}
        </div>
      ) : (
        <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.p.3-AiC0dZ", id: "orders.order-details.order-details-page-content.shipping-quotes.p.3" })} className="px-3 py-3 text-sm leading-6 text-muted-foreground">
          تُراجع وجهة المشتري أولًا، ثم تُرسل قيمة الشحن. لا تُضاف القيمة إلى
          إجمالي الطلب إلا بعد موافقة المشتري.
        </p>
      )}

      {canSend ? (
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.div.5-G016iE", id: "orders.order-details.order-details-page-content.shipping-quotes.div.5" })} className="grid gap-3 border-t border-primary/15 px-3 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <label {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.label-6V60fU", id: "orders.order-details.order-details-page-content.shipping-quotes.label" })} className="space-y-1 text-xs font-semibold">
            قيمة الشحن الأساسية بالجنيه
            <Input ui={{ uid: "orders.shipping-quote.amount-U6PMk0", id: "orders.shipping-quote.amount", kind: "field", part: "quote" }}
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <label {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.label.2-0TT3IL", id: "orders.order-details.order-details-page-content.shipping-quotes.label.2" })} className="space-y-1 text-xs font-semibold">
            توضيح اختياري للمشتري
            <Textarea ui={{ uid: "orders.shipping-quote.notes-0CoZxW", id: "orders.shipping-quote.notes", kind: "field", part: "quote" }}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="المسافة أو طريقة التوصيل أو مدة الوصول"
            />
          </label>
          <button {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.button-dsId5P", id: "orders.order-details.order-details-page-content.shipping-quotes.button" })}
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
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.div.6-aT8LP9", id: "orders.order-details.order-details-page-content.shipping-quotes.div.6" })} className="flex flex-wrap gap-2 border-t border-primary/15 px-3 py-3">
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

export function QuoteAmount({ id,
  label,
  value,
  currency,
  emphasized = false,
}: {
  label: string;
  value: unknown;
  currency: string;
  emphasized?: boolean;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.div.7-WZL7Hp", id: "orders.order-details.order-details-page-content.shipping-quotes.div.7" })} id={id}
      className={`rounded-lg bg-surface px-3 py-2 ${emphasized ? "ring-1 ring-primary/30" : ""}`}
    >
      <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.p.4-UMO1Mk", id: "orders.order-details.order-details-page-content.shipping-quotes.p.4" })} className="text-xs text-muted-foreground">{label}</p>
      <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipping-quotes.p.5-RAIoW8", id: "orders.order-details.order-details-page-content.shipping-quotes.p.5" })}
        className={`mt-1 ${emphasized ? "font-bold text-primary" : "font-semibold"}`}
      >
        {formatMoney(value, currency)}
      </p>
    </div>
  );
}

export { CustomRequestRow };
