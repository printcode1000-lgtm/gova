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

import { RunAction, text, isPendingSellerResponse } from "./OrderDetailsPageContent.navigation-summary";

export function CustomRequestActions({
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

export function ProfileLinks({
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

export function OrderItemRow({
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

export function ItemActions({
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
