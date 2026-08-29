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
import { uiAttributes } from "@asol/ui-registry-core";

export function ReturnsPanel({
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
    <section {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.section.2-DBvKr8", id: "orders.order-details.order-details-page-content.returns.section.2" })} id="orders.order-details.order-details-page-content.returns.section" className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.h2.2-6RD851", id: "orders.order-details.order-details-page-content.returns.h2.2" })} id="orders.order-details.order-details-page-content.returns.h2" className="font-bold">{text.returns}</h2>
      {details.returns.length === 0 ? (
        <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.p.2-Yr1U8S", id: "orders.order-details.order-details-page-content.returns.p.2" })} id="orders.order-details.order-details-page-content.returns.p" className="mt-2 text-sm text-muted-foreground">{text.noReturns}</p>
      ) : (
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.div.2-liyOA5", id: "orders.order-details.order-details-page-content.returns.div.2" })} id="orders.order-details.order-details-page-content.returns.div" className="mt-3 space-y-3">
          {details.returns.map((returnRequest) => {
            const requestItems = details.returnItems.filter(
              (item) =>
                String(item.return_request_id) === String(returnRequest.id),
            );
            const firstOrderItem = details.orderItems.find((orderItem) =>
              requestItems.some(
                (item) => String(item.order_item_id) === String(orderItem.id),
              ),
            );
            const sellerOrder = details.sellerOrders.find(
              (order) =>
                String(order.id) === String(returnRequest.seller_order_id) ||
                String(order.id) === String(firstOrderItem?.seller_order_id),
            );
            const isSeller =
              admin ||
              (sellerOrder && sessionUid === String(sellerOrder.seller_id));
            const returnRequestId = String(returnRequest.id);
            const canDecide =
              isSeller && String(returnRequest.status) === "requested";
            return (
              <div
                key={returnRequestId} {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.div.3-SslQC9", id: "orders.order-details.order-details-page-content.returns.div.3" })}
                className="rounded-lg border border-outline-variant p-3 text-sm"
              >
                <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.p.3-XMf61Z", id: "orders.order-details.order-details-page-content.returns.p.3" })} className="font-semibold">
                  {text.returnStatus}: {statusLabel(returnRequest.status)}
                </p>
                {returnRequest.reason ? (
                  <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.p.4-Ld8WhM", id: "orders.order-details.order-details-page-content.returns.p.4" })} className="mt-1 text-xs text-muted-foreground">
                    {text.returnReason}: {String(returnRequest.reason)}
                  </p>
                ) : null}
                {requestItems.length > 0 ? (
                  <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.div.4-uWf6I4", id: "orders.order-details.order-details-page-content.returns.div.4" })} className="mt-2 space-y-1">
                    {requestItems.map((requestItem) => {
                      const orderItem = details.orderItems.find(
                        (item) =>
                          String(item.id) === String(requestItem.order_item_id),
                      );
                      return (
                        <p
                          key={String(requestItem.id)} {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.p.5-KmC5E1", id: "orders.order-details.order-details-page-content.returns.p.5" })}
                          className="text-xs text-muted-foreground"
                        >
                          {String(
                            orderItem?.product_name_snapshot ?? text.product,
                          )}{" "}
                          - {text.quantity}: {String(requestItem.quantity ?? 1)}
                        </p>
                      );
                    })}
                  </div>
                ) : null}
                {canDecide ? (
                  <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.returns.div.5-j0nHBz", id: "orders.order-details.order-details-page-content.returns.div.5" })} className="mt-3 flex flex-wrap gap-2">
                    <OrderActionButton
                      action="seller_approve_return"
                      busyAction={busyAction}
                      id={returnRequestId}
                      onClick={() =>
                        runAction("seller_approve_return", { returnRequestId })
                      }
                    />
                    <OrderActionButton
                      action="seller_reject_return"
                      busyAction={busyAction}
                      id={returnRequestId}
                      tone="danger"
                      onClick={() =>
                        runAction("seller_reject_return", { returnRequestId })
                      }
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
