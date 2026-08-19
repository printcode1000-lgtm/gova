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
import { MarketplaceOrderPart13 } from "./marketplace-order-service.part-13";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart14 extends MarketplaceOrderPart13 {
  async createRefund(orderId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const paid = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) amount FROM payments WHERE order_id=? AND status IN ('partially_paid','fully_paid','refunded')",
            [orderId],
          )
        )?.amount ?? 0,
      ),
      refunded = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) amount FROM refunds WHERE order_id=? AND status IN ('partially_refunded','fully_refunded')",
            [orderId],
          )
        )?.amount ?? 0,
      );
    validateRefund(input.amount, paid, refunded);
    for (const [table, key] of [
      ["payments", "paymentId"],
      ["order_items", "orderItemId"],
      ["custom_request_items", "customRequestItemId"],
      ["return_requests", "returnRequestId"],
    ] as const) {
      if (input[key]) {
        const linked = await this.one(
          `SELECT order_id FROM ${table} WHERE id=?`,
          [input[key]],
        );
        if (!linked || linked.order_id !== orderId)
          throw new Error("Refund reference does not belong to order");
      }
    }
    const rid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO refunds (id,order_id,payment_id,order_item_id,custom_request_item_id,return_request_id,amount,currency,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'requested',?,?)",
      [
        rid,
        orderId,
        input.paymentId ?? null,
        input.orderItemId ?? null,
        input.customRequestItemId ?? null,
        input.returnRequestId ?? null,
        input.amount,
        order.currency,
        input.reason,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "refund",
      rid,
      "refund_requested",
      actor,
      null,
      "requested",
    );
    return this.one("SELECT * FROM refunds WHERE id=?", [rid]);
  }

  async executeRefund(refundId: string, actor: Actor) {
    this.requireAdmin(actor);
    const r = await this.one("SELECT * FROM refunds WHERE id=?", [refundId]);
    if (!r) throw new Error("Refund not found");
    if (["partially_refunded", "fully_refunded", "rejected"].includes(r.status))
      throw new Error("Refund is not executable");
    const ts = now();
    await this.db.execute(
      "UPDATE refunds SET status='fully_refunded',executed_at=?,updated_at=? WHERE id=?",
      [ts, ts, refundId],
    );
    if (r.order_item_id)
      await this.db.execute(
        "UPDATE order_items SET refunded_amount=refunded_amount+?,remaining_amount=MAX(0,total_price-paid_amount+refunded_amount+?),updated_at=? WHERE id=?",
        [r.amount, r.amount, ts, r.order_item_id],
      );
    if (r.custom_request_item_id)
      await this.db.execute(
        "UPDATE custom_request_items SET refunded_amount=refunded_amount+?,remaining_amount=MAX(0,total_price-paid_amount+refunded_amount+?),updated_at=? WHERE id=?",
        [r.amount, r.amount, ts, r.custom_request_item_id],
      );
    if (r.return_request_id)
      await this.db.execute(
        "UPDATE return_requests SET refund_id=?,status='refunded',updated_at=? WHERE id=?",
        [refundId, ts, r.return_request_id],
      );
    if (r.payment_id) {
      const payment = await this.one("SELECT * FROM payments WHERE id=?", [
          r.payment_id,
        ]),
        sum = Number(
          (
            await this.one(
              "SELECT COALESCE(SUM(amount),0) n FROM refunds WHERE payment_id=? AND status IN ('partially_refunded','fully_refunded')",
              [r.payment_id],
            )
          )?.n ?? 0,
        );
      if (payment && sum >= payment.amount && payment.status !== "refunded") {
        await this.db.execute(
          "UPDATE payments SET status='refunded',updated_at=? WHERE id=?",
          [ts, r.payment_id],
        );
        await this.audit(
          r.order_id,
          "payment",
          r.payment_id,
          "status_changed",
          actor,
          payment.status,
          "refunded",
        );
      }
    }
    await this.audit(
      r.order_id,
      "refund",
      refundId,
      "refund_executed",
      actor,
      r.status,
      "fully_refunded",
    );
    await this.recalculateAll(r.order_id, actor);
    return this.one("SELECT * FROM refunds WHERE id=?", [refundId]);
  }

  async createReturnRequest(orderId: string, input: any, actor: Actor) {
    return this.createAfterSale("return", orderId, input, actor);
  }

  async createReplacementRequest(orderId: string, input: any, actor: Actor) {
    return this.createAfterSale("replacement", orderId, input, actor);
  }
}
