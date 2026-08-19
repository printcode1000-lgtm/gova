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
import { MarketplaceOrderPart12 } from "./marketplace-order-service.part-12";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart13 extends MarketplaceOrderPart12 {
  async updateShipmentPricing(shipmentId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
      shipmentId,
    ]);
    if (!shipment) throw new Error("Shipment not found");
    const next = {
        base: input.base ?? shipment.base_shipping_price,
        handling: input.handling ?? shipment.extra_handling_fee,
        specialVehicle: input.specialVehicleFee ?? shipment.special_vehicle_fee,
        insurance: input.insurance ?? shipment.insurance_fee,
        discount: input.discount ?? shipment.shipping_discount_amount,
        tax: input.tax ?? shipment.tax_amount,
      },
      final = calculateShipmentPricing(next);
    await this.db.execute(
      "UPDATE shipments SET base_shipping_price=?,extra_handling_fee=?,special_vehicle_fee=?,insurance_fee=?,shipping_discount_amount=?,tax_amount=?,final_shipping_price=?,updated_at=? WHERE id=?",
      [
        next.base,
        next.handling,
        next.specialVehicle,
        next.insurance,
        next.discount,
        next.tax,
        final,
        now(),
        shipmentId,
      ],
    );
    await this.audit(
      shipment.order_id,
      "shipment",
      shipmentId,
      "shipping_fee_changed",
      actor,
      shipment.status,
      shipment.status,
      { ...next, finalShippingPrice: final },
    );
    await this.recalculateOrderPricing(shipment.order_id, actor);
    return this.one("SELECT * FROM shipments WHERE id=?", [shipmentId]);
  }

  async adminUpdateOrder(
    orderId: string,
    input: {
      notes?: string | null;
      source?: string | null;
      deliveryAddress?: unknown;
    },
    actor: Actor,
  ) {
    this.requireAdmin(actor);
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const next = {
      notes: input.notes === undefined ? order.notes : input.notes,
      source: input.source === undefined ? order.source : input.source,
      address:
        input.deliveryAddress === undefined
          ? order.delivery_address_snapshot_json
          : JSON.stringify(input.deliveryAddress),
    };
    await this.db.execute(
      "UPDATE orders SET notes=?,source=?,delivery_address_snapshot_json=?,updated_at=? WHERE id=?",
      [next.notes, next.source, next.address, now(), orderId],
    );
    await this.audit(
      orderId,
      "order",
      orderId,
      "admin_change",
      actor,
      order.calculated_status,
      order.calculated_status,
      next,
    );
    return this.one("SELECT * FROM orders WHERE id=?", [orderId]);
  }

  async setShipmentItemsStatus(
    shipmentId: string,
    status: string,
    actor: Actor,
  ) {
    this.requireCarrier(actor);
    const shipment = await this.one(
      "SELECT carrier_id FROM shipments WHERE id=?",
      [shipmentId],
    );
    if (!shipment) throw new Error("Shipment not found");
    if (actor.role !== "admin" && actor.id !== shipment.carrier_id)
      throw new Error("Forbidden");
    for (const x of await this.db.execute(
      "SELECT id,status FROM shipment_items WHERE shipment_id=?",
      [shipmentId],
    ))
      if (x.status !== status && x.status !== "closed")
        await this.updateShipmentItem(String(x.id), status, actor);
    return this.one("SELECT * FROM shipments WHERE id=?", [shipmentId]);
  }

  markShipmentInTransit = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "in_transit", a);

  markShipmentArrivedAtDistributionCenter = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "at_distribution_center", a);

  markShipmentOutForDelivery = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "out_for_delivery", a);

  markShipmentPartiallyDelivered = (id: string, a: Actor) =>
    this.recalculateShipmentStatus(id, a);

  markShipmentFullyDelivered = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "delivered", a);

  async registerPayment(
    orderId: string,
    input: {
      buyerId: string;
      method: PaymentMethod;
      amount: number;
      currency: string;
      provider?: string;
      transactionId?: string;
      transactionData?: unknown;
    },
    actor: Actor,
  ) {
    const order = await this.requireBuyerOrder(orderId, actor),
      deliveryPlan = await this.one(
        "SELECT status FROM delivery_plans WHERE order_id=?",
        [orderId],
      );
    if (
      deliveryPlan &&
      !["accepted", "completed", "separate_selected", "cancelled"].includes(
        String(deliveryPlan.status),
      )
    )
      throw new Error("Delivery plan must be resolved before payment");
    if (
      input.buyerId !== order.buyer_id ||
      input.currency.toUpperCase() !== order.currency
    )
      throw new Error("Payment buyer or currency does not match order");
    validateMoneyAndCurrency(input.amount, input.currency);
    if (input.amount <= 0) throw new Error("Payment amount must be positive");
    if (input.amount > order.remaining_total)
      throw new Error("Payment cannot exceed order remaining amount");
    const status =
        input.amount < order.remaining_total ? "partially_paid" : "fully_paid",
      pid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO payments (id,order_id,buyer_id,payment_method,amount,currency,status,provider,provider_transaction_id,transaction_data_json,paid_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        pid,
        orderId,
        input.buyerId,
        input.method,
        input.amount,
        input.currency,
        status,
        input.provider ?? null,
        input.transactionId ?? null,
        input.transactionData === undefined
          ? null
          : JSON.stringify(input.transactionData),
        ts,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "payment",
      pid,
      "payment_created",
      actor,
      null,
      status,
    );
    await this.recalculateAll(orderId, actor);
    return this.one("SELECT * FROM payments WHERE id=?", [pid]);
  }

  async markPaymentFailed(paymentId: string, actor: Actor) {
    this.requireAdmin(actor);
    const p = await this.one("SELECT * FROM payments WHERE id=?", [paymentId]);
    if (!p) throw new Error("Payment not found");
    await this.db.execute(
      "UPDATE payments SET status='failed',updated_at=? WHERE id=?",
      [now(), paymentId],
    );
    await this.audit(
      p.order_id,
      "payment",
      paymentId,
      "status_changed",
      actor,
      p.status,
      "failed",
    );
    await this.recalculateAll(p.order_id);
  }
}
