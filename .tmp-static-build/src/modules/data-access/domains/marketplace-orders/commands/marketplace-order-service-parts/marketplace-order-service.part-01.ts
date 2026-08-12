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
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart1 {
  constructor(protected db: MarketplaceDb) {}

  protected async one(sql: string, args: unknown[] = []): Promise<Row> {
    return (await this.db.execute(sql, args))[0] as Row;
  }

  protected async audit(
    orderId: string,
    entityType: string,
    entityId: string,
    action: any,
    actor: Actor,
    oldStatus?: string | null,
    newStatus?: string | null,
    newValue?: unknown,
    reason?: string,
  ) {
    await writeAuditLog(this.db, {
      orderId,
      entityType,
      entityId,
      action,
      actor,
      oldStatus,
      newStatus,
      newValue,
      reason,
    });
  }

  protected async requireBuyerOrder(orderId: string, actor: Actor) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    if (
      actor.role !== "admin" &&
      (actor.role !== "buyer" || actor.id !== order.buyer_id)
    )
      throw new Error("Forbidden");
    return order;
  }

  protected requireAdmin(actor: Actor) {
    if (actor.role !== "admin" && actor.role !== "system")
      throw new Error("Admin only");
  }

  protected requireCarrier(actor: Actor) {
    if (actor.role !== "carrier" && actor.role !== "admin")
      throw new Error("Carrier only");
  }

  protected async requireAfterSaleSeller(
    kind: "return" | "replacement",
    requestId: string,
    actor: Actor,
  ) {
    if (actor.role === "admin") return;
    if (!["seller", "service_provider"].includes(actor.role))
      throw new Error("Forbidden");
    const prefix = kind === "return" ? "return" : "replacement",
      request = await this.one(
        `SELECT seller_order_id FROM ${prefix}_requests WHERE id=?`,
        [requestId],
      );
    if (!request) throw new Error("Request not found");
    if (request.seller_order_id) {
      const so = await this.one(
        "SELECT seller_id,service_provider_id FROM seller_orders WHERE id=?",
        [request.seller_order_id],
      );
      if (
        so &&
        (so.seller_id === actor.id || so.service_provider_id === actor.id)
      )
        return;
    } else {
      const old = kind === "replacement" ? "old_" : "";
      const requestItems = await this.db.execute(
        `SELECT ${old}order_item_id order_item_id, ${old}custom_request_item_id custom_request_item_id FROM ${prefix}_request_items WHERE ${prefix}_request_id=?`,
        [requestId],
      );
      const orderItemIds = requestItems
        .map((item) => item.order_item_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      const customItemIds = requestItems
        .map((item) => item.custom_request_item_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      if (orderItemIds.length > 0) {
        const rows = await this.db.execute(
          `SELECT seller_id FROM order_items WHERE id IN (${orderItemIds.map(() => "?").join(",")})`,
          orderItemIds,
        );
        if (rows.some((item) => item.seller_id === actor.id)) return;
      }
      if (customItemIds.length > 0) {
        const rows = await this.db.execute(
          `SELECT seller_id,service_provider_id FROM custom_request_items WHERE id IN (${customItemIds.map(() => "?").join(",")})`,
          customItemIds,
        );
        if (
          rows.some(
            (item) => item.seller_id === actor.id || item.service_provider_id === actor.id,
          )
        )
          return;
      }
    }
    throw new Error("Forbidden");
  }

  protected async validateDisputeReferences(orderId: string, refs: Row) {
    for (const [table, key] of [
      ["seller_orders", "seller_order_id"],
      ["order_items", "order_item_id"],
      ["custom_request_items", "custom_request_item_id"],
      ["shipments", "shipment_id"],
      ["return_requests", "return_request_id"],
    ] as const)
      if (refs[key]) {
        const row = await this.one(`SELECT order_id FROM ${table} WHERE id=?`, [
          refs[key],
        ]);
        if (!row || row.order_id !== orderId)
          throw new Error("Invalid dispute reference");
      }
  }

  protected async requireDisputeAccess(orderId: string, refs: Row, actor: Actor) {
    if (actor.role === "admin") return;
    const order = await this.one("SELECT buyer_id FROM orders WHERE id=?", [
      orderId,
    ]);
    if (!order) throw new Error("Order not found");
    if (actor.role === "buyer" && actor.id === order.buyer_id) return;
    if (refs.seller_order_id) {
      const so = await this.one(
        "SELECT order_id,seller_id,service_provider_id FROM seller_orders WHERE id=?",
        [refs.seller_order_id],
      );
      if (!so || so.order_id !== orderId)
        throw new Error("Invalid dispute reference");
      if (
        ["seller", "service_provider"].includes(actor.role) &&
        (so.seller_id === actor.id || so.service_provider_id === actor.id)
      )
        return;
    }
    for (const [table, key] of [
      ["order_items", "order_item_id"],
      ["custom_request_items", "custom_request_item_id"],
    ] as const) {
      if (refs[key]) {
        const providerColumn =
            table === "order_items"
              ? "NULL service_provider_id"
              : "service_provider_id",
          item = await this.one(
            `SELECT order_id,seller_id,${providerColumn} FROM ${table} WHERE id=?`,
            [refs[key]],
          );
        if (!item || item.order_id !== orderId)
          throw new Error("Invalid dispute reference");
        if (
          ["seller", "service_provider"].includes(actor.role) &&
          (item.seller_id === actor.id || item.service_provider_id === actor.id)
        )
          return;
      }
    }
    if (refs.shipment_id) {
      const shipment = await this.one(
        "SELECT order_id,carrier_id FROM shipments WHERE id=?",
        [refs.shipment_id],
      );
      if (!shipment || shipment.order_id !== orderId)
        throw new Error("Invalid dispute reference");
      if (actor.role === "carrier" && shipment.carrier_id === actor.id) return;
    }
    if (refs.return_request_id) {
      const request = await this.one(
        "SELECT order_id,buyer_id FROM return_requests WHERE id=?",
        [refs.return_request_id],
      );
      if (!request || request.order_id !== orderId)
        throw new Error("Invalid dispute reference");
      if (actor.role === "buyer" && request.buyer_id === actor.id) return;
    }
    throw new Error("Forbidden");
  }

  async createProductOrder(input: any, actor: Actor) {
    return this.createOrder("product_order", input, actor);
  }

  async createCustomRequestOrder(input: any, actor: Actor) {
    return this.createOrder("custom_request_order", input, actor);
  }

  async createMixedOrder(input: any, actor: Actor) {
    return this.createOrder("mixed_order", input, actor);
  }

  protected async createOrder(type: OrderType, input: any, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Forbidden");
    const buyerId = input.buyerId ?? actor.id;
    if (actor.role === "buyer" && buyerId !== actor.id)
      throw new Error("Forbidden");
    const oid = id(),
      ts = now(),
      currency = String(input.currency ?? "").toUpperCase();
    validateMoneyAndCurrency(0, currency);
    validateMoneyAndCurrency(input.orderDiscount ?? 0, currency);
    await this.db.execute(
      "INSERT INTO orders (id,order_number,buyer_id,order_type,delivery_address_snapshot_json,currency,notes,source,order_discount_total,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [
        oid,
        input.orderNumber ?? `ASOL-${Date.now()}-${oid.slice(0, 6)}`,
        buyerId,
        type,
        JSON.stringify(input.deliveryAddress ?? {}),
        currency,
        input.notes ?? null,
        input.source ?? actor.source ?? null,
        input.orderDiscount ?? 0,
        ts,
        ts,
      ],
    );
    await this.audit(oid, "order", oid, "created", actor, null, "new");
    return this.one("SELECT * FROM orders WHERE id=?", [oid]);
  }

  abstract ensureSellerOrder(orderId: string, sellerId: string, type: string, actor: Actor, serviceProviderId?: string): any;

  abstract addOrderItem(orderId: string, input: any, actor: Actor): any;

  abstract addCustomRequestItem(orderId: string, input: any, actor: Actor): any;

  abstract addCustomRequestImage(itemId: string, input: any, actor: Actor): any;

  protected abstract setItemStatus(table: "order_items" | "custom_request_items", itemId: string, status: string, actor: Actor, action?: any, reason?: string): any;

  protected abstract sellerActor(actor: Actor): any;

  protected abstract productSellerActor(actor: Actor): any;

  abstract sellerMarkItemPreparing(itemId: string, actor: Actor): any;

  abstract sellerMarkItemReadyForShipping(itemId: string, actor: Actor): any;

  abstract sellerAcceptCustomRequest(itemId: string, actor: Actor): any;

  abstract sellerRejectCustomRequest(itemId: string, actor: Actor, reason?: string): any;

  abstract sellerSendPriceOfferForCustomRequest(itemId: string, input: any, actor: Actor): any;

  abstract buyerAcceptCustomRequestPrice(itemId: string, actor: Actor): any;

  abstract cancelOrderItem(itemId: string, reason: string, actor: Actor): any;

  abstract cancelCustomRequestItem(itemId: string, reason: string, actor: Actor): any;

  protected abstract createCancellation(orderId: string, input: any, actor: Actor): any;

  abstract cancelFullOrder(orderId: string, reason: string, actor: Actor): any;

  abstract cancelSellerOrder(sellerOrderId: string, reason: string, actor: Actor): any;

  abstract buyerRejectDeliveryItem(itemId: string, reason: string, actor: Actor): any;

  abstract buyerRejectSellerDelivery(sellerOrderId: string, reason: string, actor: Actor): any;

  abstract buyerRejectOrderDelivery(orderId: string, reason: string, actor: Actor): any;

  abstract createUnifiedDeliveryPlan(orderId: string, input: any, actor: Actor): any;

  protected abstract setOrderItemShipping(item: Row, shipping: number): any;

  protected abstract reconcileDeliveryPlanAfterItemCancellation(orderId: string, sellerOrderId: string, actor: Actor): any;

  protected abstract applyAcceptedDeliveryPlanPrices(plan: Row, actor: Actor): any;

  abstract proposeUnifiedDeliveryQuote(planId: string, input: any, actor: Actor): any;

  abstract acceptUnifiedDeliveryQuote(quoteId: string, actor: Actor): any;

  abstract rejectUnifiedDeliveryQuote(quoteId: string, actor: Actor): any;

  abstract chooseSeparateDelivery(planId: string, actor: Actor): any;

  abstract createUnifiedDeliveryShipment(planId: string, actor: Actor): any;

  abstract requestShippingQuote(orderId: string, sellerOrderId: string, specialVehicleFee: number, actor: Actor): any;

  protected abstract requireAcceptedShippingQuote(sellerOrderId: string): any;

  protected abstract reconcileShippingQuoteAfterItemCancellation(sellerOrderId: string, actor: Actor): any;

  abstract proposeShippingQuote(sellerOrderId: string, input: any, actor: Actor): any;

  protected abstract applyAcceptedShippingQuote(quote: Row, actor: Actor): any;

  abstract acceptShippingQuote(quoteId: string, actor: Actor): any;

  abstract rejectShippingQuote(quoteId: string, actor: Actor): any;

  abstract createShipment(orderId: string, input: any, actor: Actor): any;

  abstract createSellerOrderShipment(orderId: string, input: any, actor: Actor): any;

  abstract assignOrderItemToShipment(shipmentId: string, itemId: string, quantity: number, actor: Actor): any;

  abstract assignCustomRequestItemToShipment(shipmentId: string, itemId: string, quantity: number, actor: Actor): any;

  protected abstract assignToShipment(shipmentId: string, ref: ItemRef, actor: Actor): any;

  protected abstract syncShipmentTransport(shipmentId: string, actor: Actor): any;

  protected abstract updateShipmentItem(itemId: string, status: string, actor: Actor): any;

  abstract updateShipmentTracking(shipmentId: string, trackingNumber: string, actor: Actor): any;

  abstract updateShipmentPricing(shipmentId: string, input: any, actor: Actor): any;

  abstract adminUpdateOrder(orderId: string, input: {
    notes?: string | null;
    source?: string | null;
    deliveryAddress?: unknown;
}, actor: Actor): any;

  abstract setShipmentItemsStatus(shipmentId: string, status: string, actor: Actor): any;

  abstract registerPayment(orderId: string, input: {
    buyerId: string;
    method: PaymentMethod;
    amount: number;
    currency: string;
    provider?: string;
    transactionId?: string;
    transactionData?: unknown;
}, actor: Actor): any;

  abstract markPaymentFailed(paymentId: string, actor: Actor): any;

  abstract createRefund(orderId: string, input: any, actor: Actor): any;

  abstract executeRefund(refundId: string, actor: Actor): any;

  abstract createReturnRequest(orderId: string, input: any, actor: Actor): any;

  abstract createReplacementRequest(orderId: string, input: any, actor: Actor): any;

  protected abstract createAfterSale(kind: "return" | "replacement", orderId: string, input: any, actor: Actor): any;

  abstract decideAfterSale(kind: "return" | "replacement", requestId: string, approved: boolean, actor: Actor, reason?: string): any;

  abstract openDispute(orderId: string, input: any, actor: Actor): any;

  abstract replyToDispute(disputeId: string, message: string, actor: Actor): any;

  abstract adminResolveDispute(disputeId: string, decision: string, actor: Actor): any;

  abstract recalculateShipmentPricing(shipmentId: string, actor?: Actor): any;

  abstract recalculateShipmentStatus(shipmentId: string, actor?: Actor): any;

  abstract recalculateSellerOrderStatus(sellerOrderId: string, actor?: Actor): any;

  abstract recalculateSellerOrderPricing(sellerOrderId: string, actor?: Actor): any;

  abstract recalculateOrderPricing(orderId: string, actor?: Actor): any;

  abstract recalculateOrderStatus(orderId: string, actor?: Actor): any;

  protected abstract recalculateAll(orderId: string, actor?: Actor): any;
}
