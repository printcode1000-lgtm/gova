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
import { shipmentActionAvailability } from "./shipment-action-model";

export function OrderLevelActions({
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
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 className="font-bold">{text.orderActions}</h2>
      <div className="mt-3 space-y-2">
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

export function ShipmentsPanel({
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
      <h2 className="font-bold">{text.shipments}</h2>
      {details.shipments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{text.noShipments}</p>
      ) : (
        <div className="mt-3 space-y-3">
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

export function ShipmentCard({
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
}) {
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
    <div className="rounded-lg border border-outline-variant p-3">
      <p className="text-sm font-semibold">{statusLabel(shipment.status)}</p>
      <p className="text-xs text-muted-foreground">
        {text.carrierCompany}:{" "}
        {profileName(details.profiles[carrierId], carrierId || text.unknown)}
      </p>
      {isCarrier ? (
        <div className="mt-3 flex flex-wrap gap-2">
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
        <div className="mt-3 border-t border-outline-variant pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {text.shipmentItems}
          </p>
          <div className="space-y-2">
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

export function ShipmentItemRow({
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
}) {
  const shipmentItemId = String(shipmentItem.id);
  const orderItem = details.orderItems.find(
    (item) => String(item.id) === String(shipmentItem.order_item_id),
  );
  const title = String(orderItem?.product_name_snapshot ?? text.product);
  return (
    <div className="rounded-lg bg-background p-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
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
