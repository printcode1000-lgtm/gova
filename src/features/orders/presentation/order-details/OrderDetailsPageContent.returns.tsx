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
    <section className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 className="font-bold">{text.returns}</h2>
      {details.returns.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{text.noReturns}</p>
      ) : (
        <div className="mt-3 space-y-3">
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
                key={returnRequestId}
                className="rounded-lg border border-outline-variant p-3 text-sm"
              >
                <p className="font-semibold">
                  {text.returnStatus}: {statusLabel(returnRequest.status)}
                </p>
                {returnRequest.reason ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {text.returnReason}: {String(returnRequest.reason)}
                  </p>
                ) : null}
                {requestItems.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {requestItems.map((requestItem) => {
                      const orderItem = details.orderItems.find(
                        (item) =>
                          String(item.id) === String(requestItem.order_item_id),
                      );
                      return (
                        <p
                          key={String(requestItem.id)}
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
                  <div className="mt-3 flex flex-wrap gap-2">
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
