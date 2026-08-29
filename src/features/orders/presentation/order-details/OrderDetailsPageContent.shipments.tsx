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
import { shipmentActionAvailability } from "./shipment-action-model";
import { uiAttributes } from "@asol/ui-registry-core";

export function OrderLevelActions({ id,
  order,
  isBuyer,
  canRejectAnyDelivery,
  busyAction,
  runAction,
}: {
  order: DbRow;
  isBuyer: boolean;
  canRejectAnyDelivery: boolean;
  busyAction: string;
  runAction: RunAction;
} & { id?: string }) {
  return (
    <section {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.section-EDnh6M", id: "orders.order-details.order-details-page-content.shipments.section" })} id={id} className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.h2-mVuX0H", id: "orders.order-details.order-details-page-content.shipments.h2" })} className="font-bold">{text.orderActions}</h2>
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div-6UDqDS", id: "orders.order-details.order-details-page-content.shipments.div" })} className="mt-3 space-y-2">
        {isBuyer && canCancelStatus(order.calculated_status) ? (
          <OrderActionButton
            action="buyer_cancel_order"
            busyAction={busyAction}
            id={String(order.id)}
            tone="danger"
            full
            onClick={() => runAction("buyer_cancel_order", {})}
          />
        ) : null}
        {isBuyer && canRejectAnyDelivery ? (
          <OrderActionButton
            action="buyer_reject_delivery_order"
            busyAction={busyAction}
            id={String(order.id)}
            tone="danger"
            full
            onClick={() => runAction("buyer_reject_delivery_order", {})}
          />
        ) : null}
      </div>
    </section>
  );
}

export function ShipmentsPanel({ id,
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
} & { id?: string }) {
  return (
    <section {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.section.2-AMQ2QL", id: "orders.order-details.order-details-page-content.shipments.section.2" })} id={id} className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.h2.2-3Mzj67", id: "orders.order-details.order-details-page-content.shipments.h2.2" })} className="font-bold">{text.shipments}</h2>
      {details.shipments.length === 0 ? (
        <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.p-ABK6Dr", id: "orders.order-details.order-details-page-content.shipments.p" })} className="mt-2 text-sm text-muted-foreground">{text.noShipments}</p>
      ) : (
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.2-NTF9wR", id: "orders.order-details.order-details-page-content.shipments.div.2" })} className="mt-3 space-y-3">
          {details.shipments.map((shipment) => (
            <ShipmentCard
              key={String(shipment.id)}
              shipment={shipment}
              details={details}
              sessionUid={sessionUid}
              admin={admin}
              busyAction={busyAction}
              runAction={runAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function ShipmentCard({ id,
  shipment,
  details,
  sessionUid,
  admin,
  busyAction,
  runAction,
}: {
  shipment: DbRow;
  details: OrderDetails;
  sessionUid: string;
  admin: boolean;
  busyAction: string;
  runAction: RunAction;
} & { id?: string }) {
  const shipmentId = String(shipment.id);
  const carrierId = String(shipment.carrier_id ?? "");
  const isCarrier = admin || sessionUid === carrierId;
  const shipmentItems = details.shipmentItems.filter(
    (item) => String(item.shipment_id) === shipmentId,
  );
  const {
    canReceive,
    canReject,
    canTransit,
    canOutForDelivery,
    canDeliver,
  } = shipmentActionAvailability(shipment.status);

  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.3-WNR2cB", id: "orders.order-details.order-details-page-content.shipments.div.3" })} id={id} className="rounded-lg border border-outline-variant p-3">
      <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.p.2-XjTlC5", id: "orders.order-details.order-details-page-content.shipments.p.2" })} className="text-sm font-semibold">{statusLabel(shipment.status)}</p>
      <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.p.3-VNmr8v", id: "orders.order-details.order-details-page-content.shipments.p.3" })} className="text-xs text-muted-foreground">
        {text.carrierCompany}:{" "}
        {profileName(details.profiles[carrierId], carrierId || text.unknown)}
      </p>
      {isCarrier ? (
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.4-3Zdn6l", id: "orders.order-details.order-details-page-content.shipments.div.4" })} className="mt-3 flex flex-wrap gap-2">
          {canReceive ? (
            <OrderActionButton
              action="carrier_receive_shipment"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() =>
                runAction("carrier_receive_shipment", { shipmentId })
              }
            />
          ) : null}
          {canReject ? (
            <OrderActionButton
              action="carrier_reject_shipment"
              busyAction={busyAction}
              id={shipmentId}
              tone="danger"
              onClick={() =>
                runAction("carrier_reject_shipment", { shipmentId })
              }
            />
          ) : null}
          {canTransit ? (
            <OrderActionButton
              action="carrier_in_transit"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() => runAction("carrier_in_transit", { shipmentId })}
            />
          ) : null}
          {canOutForDelivery ? (
            <OrderActionButton
              action="carrier_out_for_delivery"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() =>
                runAction("carrier_out_for_delivery", { shipmentId })
              }
            />
          ) : null}
          {canDeliver ? (
            <OrderActionButton
              action="carrier_delivered"
              busyAction={busyAction}
              id={shipmentId}
              onClick={() => runAction("carrier_delivered", { shipmentId })}
            />
          ) : null}
        </div>
      ) : null}
      {shipmentItems.length > 0 ? (
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.5-HvolX3", id: "orders.order-details.order-details-page-content.shipments.div.5" })} className="mt-3 border-t border-outline-variant pt-3">
          <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.p.4-W7tRZm", id: "orders.order-details.order-details-page-content.shipments.p.4" })} className="mb-2 text-xs font-semibold text-muted-foreground">
            {text.shipmentItems}
          </p>
          <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.6-MNm434", id: "orders.order-details.order-details-page-content.shipments.div.6" })} className="space-y-2">
            {shipmentItems.map((shipmentItem) => (
              <ShipmentItemRow
                key={String(shipmentItem.id)}
                shipmentItem={shipmentItem}
                details={details}
                isCarrier={isCarrier}
                busyAction={busyAction}
                runAction={runAction}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ShipmentItemRow({ id,
  shipmentItem,
  details,
  isCarrier,
  busyAction,
  runAction,
}: {
  shipmentItem: DbRow;
  details: OrderDetails;
  isCarrier: boolean;
  busyAction: string;
  runAction: RunAction;
} & { id?: string }) {
  const shipmentItemId = String(shipmentItem.id);
  const orderItem = details.orderItems.find(
    (item) => String(item.id) === String(shipmentItem.order_item_id),
  );
  const title = String(orderItem?.product_name_snapshot ?? text.product);
  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.7-q5F6wD", id: "orders.order-details.order-details-page-content.shipments.div.7" })} id={id} className="rounded-lg bg-background p-2 text-sm">
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.8-eKUN73", id: "orders.order-details.order-details-page-content.shipments.div.8" })} className="flex flex-wrap items-center justify-between gap-2">
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.div.9-0UIjn9", id: "orders.order-details.order-details-page-content.shipments.div.9" })}>
          <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.p.5-3vY24T", id: "orders.order-details.order-details-page-content.shipments.p.5" })} className="font-semibold">{title}</p>
          <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.shipments.p.6-qZA9Xe", id: "orders.order-details.order-details-page-content.shipments.p.6" })} className="text-xs text-muted-foreground">
            {text.quantity}: {String(shipmentItem.quantity ?? 1)} -{" "}
            {statusLabel(shipmentItem.status)}
          </p>
        </div>
        {isCarrier && canDeliverShipmentItemStatus(shipmentItem.status) ? (
          <OrderActionButton
            action="carrier_deliver_shipment_item"
            busyAction={busyAction}
            id={shipmentItemId}
            onClick={() =>
              runAction("carrier_deliver_shipment_item", { shipmentItemId })
            }
          />
        ) : null}
      </div>
    </div>
  );
}
