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
import { MarketplaceOrderPart3 } from "./marketplace-order-service.part-03";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart4 extends MarketplaceOrderPart3 {
  async sellerSendPriceOfferForCustomRequest(
    itemId: string,
    input: any,
    actor: Actor,
  ) {
    this.sellerActor(actor);
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    if (
      actor.role !== "admin" &&
      actor.id !== item.seller_id &&
      actor.id !== item.service_provider_id
    )
      throw new Error("Forbidden");
    const p = calculateItemPricing({
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      itemDiscount: input.discount,
      shipping: input.shipping,
      shippingDiscount: input.shippingDiscount,
      specialVehicleFee: input.specialVehicleFee,
      handlingFee: input.handlingFee,
      tax: input.tax,
      serviceFee: input.serviceFee,
      commission: input.commission,
    });
    await this.db.execute(
      "UPDATE custom_request_items SET final_unit_price=?,quantity=?,subtotal_price=?,discount_amount=?,shipping_price=?,shipping_discount_amount=?,special_vehicle_fee=?,handling_fee=?,tax_amount=?,service_fee_amount=?,commission_amount=?,total_price=?,remaining_amount=?,price_offer_expires_at=?,seller_provided_description=?,status='price_offer_sent',updated_at=? WHERE id=?",
      [
        input.unitPrice,
        input.quantity,
        p.subtotal,
        input.discount ?? 0,
        input.shipping ?? 0,
        input.shippingDiscount ?? 0,
        input.specialVehicleFee ?? 0,
        input.handlingFee ?? 0,
        input.tax ?? 0,
        input.serviceFee ?? 0,
        input.commission ?? 0,
        p.total,
        p.remaining,
        input.expiresAt ?? null,
        input.description ?? null,
        now(),
        itemId,
      ],
    );
    await this.audit(
      item.order_id,
      "custom_request_item",
      itemId,
      "price_changed",
      actor,
      item.status,
      "price_offer_sent",
      { total: p.total },
    );
    await this.recalculateAll(item.order_id);
    return this.one("SELECT * FROM custom_request_items WHERE id=?", [itemId]);
  }

  async buyerAcceptCustomRequestPrice(itemId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    validatePriceOfferExpiry(item?.price_offer_expires_at ?? null);
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "buyer_accepted_price",
      actor,
      "accepted",
    );
  }

  buyerRejectCustomRequestPrice = (itemId: string, actor: Actor) => {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "buyer_rejected_price",
      actor,
      "rejected",
    );
  };

  async cancelOrderItem(itemId: string, reason: string, actor: Actor) {
    const item = await this.one("SELECT * FROM order_items WHERE id=?", [
      itemId,
    ]);
    if (!item) throw new Error("Item not found");
    if (["delivered", "closed"].includes(item.status))
      throw new Error("Delivered/closed items require a return flow");
    await this.createCancellation(
      item.order_id,
      { orderItemId: itemId, affectedAmount: item.total_price, reason },
      actor,
    );
    const result = await this.setItemStatus(
      "order_items",
      itemId,
      actor.role === "admin" ? "admin_cancelled" : "buyer_cancelled",
      actor,
      "cancelled",
      reason,
    );
    await this.reconcileShippingQuoteAfterItemCancellation(
      item.seller_order_id,
      actor,
    );
    await this.reconcileDeliveryPlanAfterItemCancellation(
      item.order_id,
      item.seller_order_id,
      actor,
    );
    return result;
  }

  async cancelCustomRequestItem(itemId: string, reason: string, actor: Actor) {
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    if (["delivered", "closed"].includes(item.status))
      throw new Error("Delivered/closed items require a return flow");
    await this.createCancellation(
      item.order_id,
      { customRequestItemId: itemId, affectedAmount: item.total_price, reason },
      actor,
    );
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      actor.role === "admin" ? "admin_cancelled" : "buyer_cancelled",
      actor,
      "cancelled",
      reason,
    );
  }

  protected async createCancellation(orderId: string, input: any, actor: Actor) {
    const order = await this.requireBuyerOrder(orderId, actor),
      cid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO cancellations (id,order_id,seller_order_id,order_item_id,custom_request_item_id,cancelled_by,cancelled_by_role,reason,affected_amount,currency,requires_refund,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        cid,
        orderId,
        input.sellerOrderId ?? null,
        input.orderItemId ?? null,
        input.customRequestItemId ?? null,
        actor.id,
        actor.role,
        input.reason,
        input.affectedAmount ?? 0,
        order.currency,
        (input.affectedAmount ?? 0) > 0,
        "executed",
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "cancellation",
      cid,
      "cancelled",
      actor,
      null,
      "executed",
      undefined,
      input.reason,
    );
    return cid;
  }

  async cancelFullOrder(orderId: string, reason: string, actor: Actor) {
    await this.requireBuyerOrder(orderId, actor);
    const items = await this.db.execute(
      "SELECT id FROM order_items WHERE order_id=? AND status NOT IN ('delivered','closed')",
      [orderId],
    );
    for (const x of items)
      await this.cancelOrderItem(String(x.id), reason, actor);
    const custom = await this.db.execute(
      "SELECT id FROM custom_request_items WHERE order_id=? AND status NOT IN ('delivered','closed')",
      [orderId],
    );
    for (const x of custom)
      await this.cancelCustomRequestItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM orders WHERE id=?", [orderId]);
  }

  async cancelSellerOrder(sellerOrderId: string, reason: string, actor: Actor) {
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    await this.requireBuyerOrder(so.order_id, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM order_items WHERE seller_order_id=?",
      [sellerOrderId],
    ))
      await this.cancelOrderItem(String(x.id), reason, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM custom_request_items WHERE seller_order_id=?",
      [sellerOrderId],
    ))
      await this.cancelCustomRequestItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM seller_orders WHERE id=?", [sellerOrderId]);
  }
}
