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
import { MarketplaceOrderPart2 } from "./marketplace-order-service.part-02";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart3 extends MarketplaceOrderPart2 {
  protected async setItemStatus(
    table: "order_items" | "custom_request_items",
    itemId: string,
    status: string,
    actor: Actor,
    action: any = "status_changed",
    reason?: string,
  ) {
    const item = await this.one(`SELECT * FROM ${table} WHERE id=?`, [itemId]);
    if (!item) throw new Error("Item not found");
    if (
      actor.role !== "admin" &&
      actor.role !== "system" &&
      actor.id !== item.seller_id &&
      actor.id !== item.service_provider_id &&
      actor.id !==
        (
          await this.one("SELECT buyer_id FROM orders WHERE id=?", [
            item.order_id,
          ])
        )?.buyer_id
    )
      throw new Error("Forbidden");
    await this.db.execute(
      `UPDATE ${table} SET status=?,updated_at=? WHERE id=?`,
      [status, now(), itemId],
    );
    await this.audit(
      item.order_id,
      table === "order_items" ? "order_item" : "custom_request_item",
      itemId,
      action,
      actor,
      item.status,
      status,
      undefined,
      reason,
    );
    await this.recalculateAll(item.order_id);
    return this.one(`SELECT * FROM ${table} WHERE id=?`, [itemId]);
  }

  protected sellerActor(actor: Actor) {
    if (!["seller", "service_provider", "admin"].includes(actor.role))
      throw new Error("Seller/service provider only");
  }

  protected productSellerActor(actor: Actor) {
    if (actor.role !== "seller" && actor.role !== "admin")
      throw new Error("Seller only");
  }

  sellerAcceptItem = (itemId: string, actor: Actor) => (
    this.productSellerActor(actor),
    this.setItemStatus(
      "order_items",
      itemId,
      "seller_accepted",
      actor,
      "accepted",
    )
  );

  sellerRejectItem = (itemId: string, actor: Actor, reason?: string) => (
    this.productSellerActor(actor),
    this.setItemStatus(
      "order_items",
      itemId,
      "seller_rejected",
      actor,
      "rejected",
      reason,
    )
  );

  async sellerMarkItemPreparing(itemId: string, actor: Actor) {
    this.productSellerActor(actor);
    const item = await this.one(
      "SELECT seller_order_id FROM order_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    await this.requireAcceptedShippingQuote(item.seller_order_id);
    return this.setItemStatus(
      "order_items",
      itemId,
      "preparing",
      actor,
      "status_changed",
    );
  }

  async sellerMarkItemReadyForShipping(itemId: string, actor: Actor) {
    this.productSellerActor(actor);
    const item = await this.one(
      "SELECT seller_order_id FROM order_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    await this.requireAcceptedShippingQuote(item.seller_order_id);
    return this.setItemStatus(
      "order_items",
      itemId,
      "ready_for_shipping",
      actor,
      "status_changed",
    );
  }

  async sellerAcceptCustomRequest(itemId: string, actor: Actor) {
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
    await this.db.execute(
      "UPDATE custom_request_items SET seller_accepted=1,updated_at=? WHERE id=?",
      [now(), itemId],
    );
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "waiting_for_pricing",
      actor,
      "accepted",
    );
  }

  async sellerRejectCustomRequest(
    itemId: string,
    actor: Actor,
    reason?: string,
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
    await this.db.execute(
      "UPDATE custom_request_items SET seller_accepted=0,seller_notes=?,updated_at=? WHERE id=?",
      [reason ?? null, now(), itemId],
    );
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "seller_rejected",
      actor,
      "rejected",
      reason,
    );
  }
}
