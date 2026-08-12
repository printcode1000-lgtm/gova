import { randomUUID } from "node:crypto";
import type { MarketplaceDb } from "@/modules/data-access/domains/marketplace-orders/ports/marketplace-order-store";
import type { Actor, ItemRef, OrderAggregate } from "@/modules/marketplace-orders/domain/types";
import type { OrderType, PaymentMethod } from "@/modules/marketplace-orders/domain/enums";
import { writeAuditLog } from "@/modules/data-access/domains/marketplace-orders/commands/write-audit-log.command";
import {
  calculateOrderStatus,
  calculateSellerOrderStatus,
  calculateShipmentStatus,
} from "@/modules/marketplace-orders/calculators/status-calculators";
import {
  calculateItemPricing,
  calculateOrderPricing,
  calculateShipmentPricing,
} from "@/modules/marketplace-orders/calculators/pricing-calculator";
import {
  NON_SHIPPABLE,
  RETURN_ELIGIBLE,
  validateImageAttachment,
  validateItemRef,
  validateMoneyAndCurrency,
  validatePriceOfferExpiry,
  validateRefund,
} from "@/modules/marketplace-orders/validators";
import { MarketplaceOrderPart11 } from "./marketplace-order-service.part-11";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart12 extends MarketplaceOrderPart11 {
  protected async syncShipmentTransport(shipmentId: string, actor: Actor) {
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
      shipmentId,
    ]);
    const shipmentItems = await this.db.execute(
      "SELECT * FROM shipment_items WHERE shipment_id=?",
      [shipmentId],
    );
    const orderItemIds = shipmentItems
      .map((item) => item.order_item_id)
      .filter(Boolean);
    const customItemIds = shipmentItems
      .map((item) => item.custom_request_item_id)
      .filter(Boolean);
    const orderItems =
      orderItemIds.length > 0
        ? await this.db.execute(
            `SELECT requires_special_vehicle,requires_refrigeration,requires_special_loading,required_vehicle_type,weight FROM order_items WHERE id IN (${orderItemIds.map(() => "?").join(",")})`,
            orderItemIds,
          )
        : [];
    const customItems =
      customItemIds.length > 0
        ? await this.db.execute(
            `SELECT requires_special_vehicle,requires_refrigeration,requires_special_loading,required_vehicle_type,estimated_weight FROM custom_request_items WHERE id IN (${customItemIds.map(() => "?").join(",")})`,
            customItemIds,
          )
        : [];
    const transportRows: Array<Record<string, unknown>> = [
      ...orderItems.map((item) => ({ ...item, row_weight: item.weight })),
      ...customItems.map((item) => ({ ...item, row_weight: item.estimated_weight })),
    ];
    const totalWeight = transportRows.reduce((sum, item) => {
      const weight = item.row_weight == null ? 0 : Number(item.row_weight);
      return sum + (Number.isFinite(weight) ? weight : 0);
    }, 0);
    const next = {
      containsSpecialVehicleItems: transportRows.some((item) => Number(item.requires_special_vehicle) > 0) ? 1 : 0,
      requiresRefrigeration: transportRows.some((item) => Number(item.requires_refrigeration) > 0) ? 1 : 0,
      requiresSpecialLoading: transportRows.some((item) => Number(item.requires_special_loading) > 0) ? 1 : 0,
      requiredVehicleType:
        transportRows.find((item) => item.required_vehicle_type)?.required_vehicle_type ?? null,
      totalWeight: totalWeight > 0 ? totalWeight : null,
    };
    await this.db.execute(
      "UPDATE shipments SET contains_special_vehicle_items=?,requires_refrigeration=?,requires_special_loading=?,required_vehicle_type=?,total_weight=?,updated_at=? WHERE id=?",
      [
        next.containsSpecialVehicleItems,
        next.requiresRefrigeration,
        next.requiresSpecialLoading,
        next.requiredVehicleType,
        next.totalWeight,
        now(),
        shipmentId,
      ],
    );
    if (
      shipment &&
      (shipment.contains_special_vehicle_items !==
        next.containsSpecialVehicleItems ||
        shipment.requires_refrigeration !== next.requiresRefrigeration ||
        shipment.requires_special_loading !== next.requiresSpecialLoading ||
        shipment.total_weight !== next.totalWeight)
    )
      await this.audit(
        shipment.order_id,
        "shipment",
        shipmentId,
        "updated",
        actor,
        shipment.status,
        shipment.status,
        next,
      );
  }

  protected async updateShipmentItem(
    itemId: string,
    status: string,
    actor: Actor,
  ) {
    this.requireCarrier(actor);
    const si = await this.one(
      "SELECT si.*,s.carrier_id FROM shipment_items si JOIN shipments s ON s.id=si.shipment_id WHERE si.id=?",
      [itemId],
    );
    if (!si) throw new Error("Shipment item not found");
    if (actor.role !== "admin" && actor.id !== si.carrier_id)
      throw new Error("Forbidden");
    if (
      status === "delivered" &&
      !["in_transit", "at_distribution_center", "out_for_delivery"].includes(
        si.status,
      )
    )
      throw new Error(
        "Item must be in transit or out for delivery before delivery",
      );
    await this.db.execute(
      "UPDATE shipment_items SET status=?,carrier_received_at=CASE WHEN ?='received_by_carrier' THEN ? ELSE carrier_received_at END,delivered_at=CASE WHEN ?='delivered' THEN ? ELSE delivered_at END,updated_at=? WHERE id=?",
      [status, status, now(), status, now(), now(), itemId],
    );
    const table =
        si.item_type === "order_item" ? "order_items" : "custom_request_items",
      itemStatus: Record<string, string> = {
        assigned: "assigned_to_shipment",
        received_by_carrier: "assigned_to_shipment",
        rejected_by_carrier: "ready_for_shipping",
        in_transit: "in_transit",
        at_distribution_center: "in_transit",
        out_for_delivery: "in_transit",
        delivered: "delivered",
        delivery_rejected: "delivery_rejected",
        delivery_failed: "delivery_rejected",
        returned: "returned",
        closed: "closed",
      },
      target = itemStatus[status];
    if (!target) throw new Error("Unsupported shipment item status");
    await this.db.execute(
      `UPDATE ${table} SET status=?,updated_at=? WHERE id=?`,
      [target, now(), si.order_item_id ?? si.custom_request_item_id],
    );
    await this.audit(
      si.order_id,
      "shipment_item",
      itemId,
      status === "delivered"
        ? "delivered"
        : status === "delivery_rejected"
          ? "delivery_rejected"
          : status === "received_by_carrier"
            ? "received"
            : status === "rejected_by_carrier"
              ? "rejected"
              : "status_changed",
      actor,
      si.status,
      status,
    );
    await this.recalculateAll(si.order_id);
    return this.one("SELECT * FROM shipment_items WHERE id=?", [itemId]);
  }

  carrierReceiveShipmentItem = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "received_by_carrier", a);

  carrierRejectShipmentItem = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "rejected_by_carrier", a);

  markShipmentItemDelivered = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "delivered", a);

  markShipmentItemDeliveryRejected = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "delivery_rejected", a);

  markShipmentItemDeliveryFailed = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "delivery_failed", a);

  async updateShipmentTracking(
    shipmentId: string,
    trackingNumber: string,
    actor: Actor,
  ) {
    this.requireCarrier(actor);
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
      shipmentId,
    ]);
    if (!shipment) throw new Error("Shipment not found");
    if (actor.role !== "admin" && actor.id !== shipment.carrier_id)
      throw new Error("Forbidden");
    await this.db.execute(
      "UPDATE shipments SET tracking_number=?,updated_at=? WHERE id=?",
      [trackingNumber, now(), shipmentId],
    );
    await this.audit(
      shipment.order_id,
      "shipment",
      shipmentId,
      "tracking_updated",
      actor,
      shipment.status,
      shipment.status,
      { trackingNumber },
    );
  }
}
