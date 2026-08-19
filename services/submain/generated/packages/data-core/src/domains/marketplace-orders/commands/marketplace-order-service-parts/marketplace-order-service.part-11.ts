import { randomUUID } from "node:crypto";
import type { MarketplaceDb } from "../../ports/marketplace-order-store";
import type { Actor, ItemRef, OrderAggregate } from "@asol/orders-core";
import type { OrderType, PaymentMethod } from "@asol/orders-core";
import { writeAuditLog } from "../write-audit-log.command";
import {
  calculateOrderStatus,
  calculateSellerOrderStatus,
  calculateShipmentStatus,
} from "@asol/orders-core";
import {
  calculateItemPricing,
  calculateOrderPricing,
  calculateShipmentPricing,
} from "@asol/orders-core";
import {
  NON_SHIPPABLE,
  RETURN_ELIGIBLE,
  validateImageAttachment,
  validateItemRef,
  validateMoneyAndCurrency,
  validatePriceOfferExpiry,
  validateRefund,
} from "@asol/orders-core";
import { MarketplaceOrderPart10 } from "./marketplace-order-service.part-10";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart11 extends MarketplaceOrderPart10 {
  async createSellerOrderShipment(orderId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const so = await this.one(
      "SELECT * FROM seller_orders WHERE id=? AND order_id=?",
      [input.sellerOrderId, orderId],
    );
    if (!so) throw new Error("Seller order not found");
    const deliveryStop = await this.one(
      "SELECT plan_id FROM delivery_plan_stops WHERE seller_order_id=? LIMIT 1",
      [so.id],
    );
    const deliveryPlan = deliveryStop
      ? await this.one("SELECT status FROM delivery_plans WHERE id=? LIMIT 1", [
          deliveryStop.plan_id,
        ])
      : null;
    if (
      deliveryPlan &&
      !["separate_selected", "cancelled"].includes(String(deliveryPlan.status))
    )
      throw new Error(
        "Use the unified delivery shipment for this seller order",
      );
    const carrierId = input.carrierId ?? so.service_provider_id;
    if (!carrierId) throw new Error("Delivery carrier is required");
    const shipment = await this.createShipment(
      orderId,
      {
        sellerOrderId: so.id,
        direction: "outbound",
        carrierId,
        shippingMethod: input.shippingMethod ?? "cash_on_delivery_delivery",
        pickupAddress: input.pickupAddress ?? {},
        deliveryAddress: input.deliveryAddress ?? {},
        base: input.base ?? so.seller_shipping_total ?? 0,
        specialVehicleFee: input.specialVehicleFee ?? 0,
      },
      actor,
    );
    const items = await this.db.execute(
      "SELECT id,quantity,status FROM order_items WHERE seller_order_id=? AND status IN ('seller_accepted','preparing','ready_for_shipping')",
      [so.id],
    );
    for (const item of items)
      await this.assignToShipment(
        String(shipment.id),
        {
          itemType: "order_item",
          orderItemId: String(item.id),
          quantity: Number(item.quantity ?? 1),
        },
        actor,
      );
    const customItems = await this.db.execute(
      "SELECT id,quantity,requested_quantity,status FROM custom_request_items WHERE seller_order_id=? AND status IN ('buyer_accepted_price','preparing','ready_for_shipping')",
      [so.id],
    );
    for (const item of customItems)
      await this.assignToShipment(
        String(shipment.id),
        {
          itemType: "custom_request_item",
          customRequestItemId: String(item.id),
          quantity: Number(item.quantity ?? item.requested_quantity ?? 1) || 1,
        },
        actor,
      );
    return this.one("SELECT * FROM shipments WHERE id=?", [shipment.id]);
  }

  async assignOrderItemToShipment(
    shipmentId: string,
    itemId: string,
    quantity: number,
    actor: Actor,
  ) {
    return this.assignToShipment(
      shipmentId,
      { itemType: "order_item", orderItemId: itemId, quantity },
      actor,
    );
  }

  async assignCustomRequestItemToShipment(
    shipmentId: string,
    itemId: string,
    quantity: number,
    actor: Actor,
  ) {
    return this.assignToShipment(
      shipmentId,
      {
        itemType: "custom_request_item",
        customRequestItemId: itemId,
        quantity,
      },
      actor,
    );
  }

  protected async assignToShipment(
    shipmentId: string,
    ref: ItemRef,
    actor: Actor,
  ) {
    this.requireAdmin(actor);
    validateItemRef(ref);
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
        shipmentId,
      ]),
      table =
        ref.itemType === "order_item" ? "order_items" : "custom_request_items",
      itemId = ref.orderItemId ?? ref.customRequestItemId,
      item = await this.one(`SELECT * FROM ${table} WHERE id=?`, [itemId]);
    if (!shipment || !item || shipment.order_id !== item.order_id)
      throw new Error("Shipment/item mismatch");
    if (NON_SHIPPABLE.has(item.status))
      throw new Error(
        "Rejected, cancelled, fulfilled or closed item cannot be shipped",
      );
    const available = Number(
      item.quantity ?? item.requested_quantity ?? item.available_quantity ?? 0,
    );
    if (available > 0 && ref.quantity > available)
      throw new Error("Shipment quantity exceeds item quantity");
    const si = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO shipment_items (id,shipment_id,order_id,seller_order_id,seller_id,service_provider_id,item_type,order_item_id,custom_request_item_id,quantity,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        si,
        shipmentId,
        item.order_id,
        item.seller_order_id,
        item.seller_id ?? null,
        item.service_provider_id ?? null,
        ref.itemType,
        ref.orderItemId ?? null,
        ref.customRequestItemId ?? null,
        ref.quantity,
        ts,
        ts,
      ],
    );
    await this.db.execute(
      `UPDATE ${table} SET status='assigned_to_shipment',updated_at=? WHERE id=?`,
      [ts, itemId],
    );
    await this.syncShipmentTransport(shipmentId, actor);
    await this.audit(
      item.order_id,
      "shipment_item",
      si,
      "assigned",
      actor,
      null,
      "assigned",
    );
    await this.recalculateAll(item.order_id, actor);
    return this.one("SELECT * FROM shipment_items WHERE id=?", [si]);
  }
}
