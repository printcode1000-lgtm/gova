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
import { MarketplaceOrderPart14 } from "./marketplace-order-service.part-14";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart15 extends MarketplaceOrderPart14 {
  protected async createAfterSale(
    kind: "return" | "replacement",
    orderId: string,
    input: any,
    actor: Actor,
  ) {
    const order = await this.requireBuyerOrder(orderId, actor);
    if (!Array.isArray(input.items) || input.items.length === 0)
      throw new Error(`${kind} requires at least one item`);
    for (const ref of input.items as ItemRef[]) {
      validateItemRef(ref);
      const itemTable =
          ref.itemType === "order_item"
            ? "order_items"
            : "custom_request_items",
        quantityColumn =
          ref.itemType === "order_item"
            ? "quantity"
            : "COALESCE(quantity,requested_quantity)",
        item = await this.one(
          `SELECT order_id,status,${quantityColumn} available_quantity FROM ${itemTable} WHERE id=?`,
          [ref.orderItemId ?? ref.customRequestItemId],
        );
      if (
        !item ||
        item.order_id !== orderId ||
        !RETURN_ELIGIBLE.has(item.status)
      )
        throw new Error(
          `${kind} requires a delivered eligible item from this order`,
        );
      const available = Number(item.available_quantity ?? 0);
      if (available > 0 && ref.quantity > available)
        throw new Error(`${kind} quantity exceeds item quantity`);
    }
    const request = id(),
      ts = now(),
      table = `${kind}_requests`;
    if (input.sellerOrderId) {
      const so = await this.one(
        "SELECT order_id FROM seller_orders WHERE id=?",
        [input.sellerOrderId],
      );
      if (!so || so.order_id !== orderId)
        throw new Error("Seller order does not belong to order");
    }
    await this.db.execute(
      `INSERT INTO ${table} (id,order_id,buyer_id,seller_order_id,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,'requested',?,?)`,
      [
        request,
        orderId,
        order.buyer_id,
        input.sellerOrderId ?? null,
        input.reason,
        ts,
        ts,
      ],
    );
    for (const ref of input.items as ItemRef[]) {
      if (kind === "return")
        await this.db.execute(
          "INSERT INTO return_request_items (id,return_request_id,item_type,order_item_id,custom_request_item_id,quantity,reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
          [
            id(),
            request,
            ref.itemType,
            ref.orderItemId ?? null,
            ref.customRequestItemId ?? null,
            ref.quantity,
            (ref as any).reason ?? null,
            ts,
            ts,
          ],
        );
      else
        await this.db.execute(
          "INSERT INTO replacement_request_items (id,replacement_request_id,old_item_type,old_order_item_id,old_custom_request_item_id,replacement_description,replacement_product_id,replacement_variant_id,quantity,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          [
            id(),
            request,
            ref.itemType,
            ref.orderItemId ?? null,
            ref.customRequestItemId ?? null,
            (ref as any).replacementDescription ?? null,
            (ref as any).replacementProductId ?? null,
            (ref as any).replacementVariantId ?? null,
            ref.quantity,
            ts,
            ts,
          ],
        );
      const itemTable =
        ref.itemType === "order_item" ? "order_items" : "custom_request_items";
      await this.db.execute(
        `UPDATE ${itemTable} SET status=?,updated_at=? WHERE id=?`,
        [
          kind === "return" ? "return_requested" : "replacement_requested",
          ts,
          ref.orderItemId ?? ref.customRequestItemId,
        ],
      );
    }
    await this.audit(
      orderId,
      `${kind}_request`,
      request,
      kind === "return" ? "return_requested" : "replacement_requested",
      actor,
      null,
      "requested",
    );
    await this.recalculateAll(orderId);
    return this.one(`SELECT * FROM ${table} WHERE id=?`, [request]);
  }

  async decideAfterSale(
    kind: "return" | "replacement",
    requestId: string,
    approved: boolean,
    actor: Actor,
    reason?: string,
  ) {
    await this.requireAfterSaleSeller(kind, requestId, actor);
    const table = `${kind}_requests`,
      r = await this.one(`SELECT * FROM ${table} WHERE id=?`, [requestId]);
    if (!r) throw new Error("Request not found");
    const status =
      kind === "return"
        ? approved
          ? "seller_approved"
          : "seller_rejected"
        : approved
          ? "accepted"
          : "rejected";
    await this.db.execute(
      `UPDATE ${table} SET seller_approved=?,seller_rejection_reason=?,status=?,updated_at=? WHERE id=?`,
      [approved, approved ? null : (reason ?? null), status, now(), requestId],
    );
    await this.audit(
      r.order_id,
      `${kind}_request`,
      requestId,
      approved ? "accepted" : "rejected",
      actor,
      r.status,
      status,
    );
    await this.recalculateAll(r.order_id);
    return this.one(`SELECT * FROM ${table} WHERE id=?`, [requestId]);
  }

  approveReturnRequest = (id: string, a: Actor) =>
    this.decideAfterSale("return", id, true, a);

  rejectReturnRequest = (id: string, a: Actor, r?: string) =>
    this.decideAfterSale("return", id, false, a, r);

  approveReplacementRequest = (id: string, a: Actor) =>
    this.decideAfterSale("replacement", id, true, a);

  rejectReplacementRequest = (id: string, a: Actor, r?: string) =>
    this.decideAfterSale("replacement", id, false, a, r);

  async openDispute(orderId: string, input: any, actor: Actor) {
    const refs = {
      seller_order_id: input.sellerOrderId ?? null,
      order_item_id: input.orderItemId ?? null,
      custom_request_item_id: input.customRequestItemId ?? null,
      shipment_id: input.shipmentId ?? null,
      return_request_id: input.returnRequestId ?? null,
    };
    await this.validateDisputeReferences(orderId, refs);
    await this.requireDisputeAccess(orderId, refs, actor);
    const did = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO disputes (id,order_id,seller_order_id,order_item_id,custom_request_item_id,shipment_id,return_request_id,opened_by,opened_by_role,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'opened',?,?)",
      [
        did,
        orderId,
        refs.seller_order_id,
        refs.order_item_id,
        refs.custom_request_item_id,
        refs.shipment_id,
        refs.return_request_id,
        actor.id,
        actor.role,
        input.reason,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "dispute",
      did,
      "dispute_opened",
      actor,
      null,
      "opened",
    );
    return this.one("SELECT * FROM disputes WHERE id=?", [did]);
  }
}
