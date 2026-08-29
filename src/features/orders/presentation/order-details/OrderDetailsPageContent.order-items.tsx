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

import { RunAction, text, isPendingSellerResponse } from "./OrderDetailsPageContent.navigation-summary";
import { CustomRequestActions } from "./OrderDetailsPageContent.custom-request-actions";
import { uiAttributes } from "@asol/ui-registry-core";

export { CustomRequestActions };

export function ProfileLinks({ id,
  sellerId,
  carrierId,
}: {
  sellerId: string;
  carrierId: string;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div-5aqnBe", id: "orders.order-details.order-details-page-content.order-items.div" })} id={id} className="flex flex-wrap gap-2">
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

export function OrderItemRow({ id,
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
} & { id?: string }) {
  const itemId = String(item.id);
  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div.2-QuWQ1n", id: "orders.order-details.order-details-page-content.order-items.div.2" })} id={id} className="rounded-xl border border-outline-variant bg-background p-3">
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div.3-81B0nU", id: "orders.order-details.order-details-page-content.order-items.div.3" })} className="flex gap-3">
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div.4-Dbq55Z", id: "orders.order-details.order-details-page-content.order-items.div.4" })} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
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
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div.5-4Lh04Z", id: "orders.order-details.order-details-page-content.order-items.div.5" })} className="min-w-0 flex-1">
          <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div.6-9yjjkV", id: "orders.order-details.order-details-page-content.order-items.div.6" })} className="flex flex-wrap items-start justify-between gap-2">
            <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div.7-Q94rOS", id: "orders.order-details.order-details-page-content.order-items.div.7" })}>
              <h3 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.h3-vVF6gv", id: "orders.order-details.order-details-page-content.order-items.h3" })} className="font-semibold">
                {String(item.product_name_snapshot ?? text.product)}
              </h3>
              <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.p-BM4Y2a", id: "orders.order-details.order-details-page-content.order-items.p" })} className="text-xs text-muted-foreground">
                {text.quantity}: {String(item.quantity ?? 1)} -{" "}
                {text.itemStatus}: {statusLabel(item.status)}
              </p>
            </div>
            <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.p.2-Y9F6iT", id: "orders.order-details.order-details-page-content.order-items.p.2" })} className="font-bold">
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
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.order-items.div.8-ewFR7T", id: "orders.order-details.order-details-page-content.order-items.div.8" })} className="mt-3 flex flex-wrap gap-2">
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
