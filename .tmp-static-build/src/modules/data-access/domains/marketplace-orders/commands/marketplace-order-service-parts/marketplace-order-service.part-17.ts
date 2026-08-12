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
import { MarketplaceOrderPart16 } from "./marketplace-order-service.part-16";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export class MarketplaceOrderPart17 extends MarketplaceOrderPart16 {
  async recalculateOrderPricing(
    orderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const rows = [
        ...(await this.db.execute(
          "SELECT subtotal_price subtotal,item_discount_amount+coupon_discount_amount discount,shipping_price shipping,shipping_discount_amount shippingDiscount,tax_amount tax,service_fee_amount serviceFee,commission_amount platformFee,total_price total,paid_amount paid,refunded_amount refunded FROM order_items WHERE order_id=?",
          [orderId],
        )),
        ...(await this.db.execute(
          "SELECT subtotal_price subtotal,discount_amount discount,shipping_price shipping,shipping_discount_amount shippingDiscount,tax_amount tax,service_fee_amount serviceFee,commission_amount platformFee,total_price total,paid_amount paid,refunded_amount refunded FROM custom_request_items WHERE order_id=?",
          [orderId],
        )),
      ] as any[],
      payments = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) n FROM payments WHERE order_id=? AND status IN ('partially_paid','fully_paid','refunded')",
            [orderId],
          )
        )?.n ?? 0,
      ),
      refunds = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) n FROM refunds WHERE order_id=? AND status IN ('partially_refunded','fully_refunded')",
            [orderId],
          )
        )?.n ?? 0,
      ),
      p = calculateOrderPricing(
        rows.map((x) => ({ ...x, paid: 0, refunded: 0 })),
        Number(order.order_discount_total),
      );
    p.paid = payments;
    p.refunded = refunds;
    p.remaining = Math.max(0, p.grandTotal - payments + refunds);
    await this.db.execute(
      "UPDATE orders SET subtotal_price=?,items_discount_total=?,order_discount_total=?,shipping_total=?,shipping_discount_total=?,tax_total=?,service_fee_total=?,platform_fee_total=?,grand_total=?,paid_total=?,refunded_total=?,remaining_total=?,updated_at=? WHERE id=?",
      [
        p.subtotal,
        p.itemsDiscount,
        p.orderDiscount,
        p.shipping,
        p.shippingDiscount,
        p.tax,
        p.serviceFee,
        p.platformFee,
        p.grandTotal,
        p.paid,
        p.refunded,
        p.remaining,
        now(),
        orderId,
      ],
    );
    if (
      order.grand_total !== p.grandTotal ||
      order.paid_total !== p.paid ||
      order.refunded_total !== p.refunded
    )
      await this.audit(
        orderId,
        "order",
        orderId,
        "price_changed",
        actor,
        order.calculated_status,
        order.calculated_status,
        p,
      );
    return p;
  }

  async recalculateOrderStatus(
    orderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const vals = async (sql: string, args: unknown[] = [orderId]) =>
        (await this.db.execute(sql, args)).map((x) => String(x.status)),
      aggregate: OrderAggregate = {
        id: order.id,
        buyerId: order.buyer_id,
        calculatedStatus: order.calculated_status,
        archivedAt: order.archived_at,
        closedAt: order.closed_at,
        itemStatuses: [
          ...(await vals("SELECT status FROM order_items WHERE order_id=?")),
          ...(await vals("SELECT status FROM custom_request_items WHERE order_id=?")),
        ],
        sellerStatuses: (await vals(
          "SELECT status FROM seller_orders WHERE order_id=?",
        )) as any,
        shipmentStatuses: (await vals(
          "SELECT status FROM shipments WHERE order_id=?",
        )) as any,
        paymentStatuses: (await vals(
          "SELECT status FROM payments WHERE order_id=?",
        )) as any,
        refundStatuses: (await vals(
          "SELECT status FROM refunds WHERE order_id=?",
        )) as any,
        cancellationStatuses: (await vals(
          "SELECT status FROM cancellations WHERE order_id=?",
        )) as any,
        returnStatuses: (await vals(
          "SELECT status FROM return_requests WHERE order_id=?",
        )) as any,
        replacementStatuses: (await vals(
          "SELECT status FROM replacement_requests WHERE order_id=?",
        )) as any,
      },
      status = calculateOrderStatus(aggregate);
    if (order.calculated_status !== status) {
      await this.db.execute(
        "UPDATE orders SET calculated_status=?,updated_at=? WHERE id=?",
        [status, now(), orderId],
      );
      await this.audit(
        orderId,
        "order",
        orderId,
        "status_changed",
        actor,
        order.calculated_status,
        status,
      );
    }
    return status;
  }

  protected async recalculateAll(
    orderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    for (const x of await this.db.execute(
      "SELECT id FROM seller_orders WHERE order_id=?",
      [orderId],
    )) {
      await this.recalculateSellerOrderStatus(String(x.id), actor);
      await this.recalculateSellerOrderPricing(String(x.id), actor);
    }
    for (const x of await this.db.execute(
      "SELECT id FROM shipments WHERE order_id=?",
      [orderId],
    ))
      await this.recalculateShipmentStatus(String(x.id), actor);
    await this.recalculateOrderPricing(orderId, actor);
    await this.recalculateOrderStatus(orderId, actor);
  }
}
