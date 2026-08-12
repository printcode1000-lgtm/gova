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
import { CustomRequestActions } from "./OrderDetailsPageContent.order-items";

export function ShippingQuotePanel({
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

export function QuoteAmount({
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

export function CustomRequestRow({
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
