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
import { MarketplaceOrderPart15 } from "./marketplace-order-service.part-15";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart16 extends MarketplaceOrderPart15 {
  async replyToDispute(disputeId: string, message: string, actor: Actor) {
    const d = await this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
    if (!d) throw new Error("Dispute not found");
    await this.requireDisputeAccess(d.order_id, d, actor);
    if (!message.trim()) throw new Error("Message is required");
    const status =
        actor.role === "buyer"
          ? "buyer_replied"
          : actor.role === "carrier"
            ? "carrier_replied"
            : actor.role === "admin"
              ? "admin_intervened"
              : "seller_replied",
      ts = now();
    await this.db.execute(
      "INSERT INTO dispute_messages (id,dispute_id,sender_id,sender_role,message,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      [id(), disputeId, actor.id, actor.role, message, ts, ts],
    );
    await this.db.execute(
      "UPDATE disputes SET status=?,updated_at=? WHERE id=?",
      [status, ts, disputeId],
    );
    await this.audit(
      d.order_id,
      "dispute",
      disputeId,
      "dispute_replied",
      actor,
      d.status,
      status,
    );
    return this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
  }

  async adminResolveDispute(disputeId: string, decision: string, actor: Actor) {
    if (actor.role !== "admin") throw new Error("Admin only");
    const d = await this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
    if (!d) throw new Error("Dispute not found");
    await this.db.execute(
      "UPDATE disputes SET status='admin_decision_issued',admin_decision=?,closed_at=?,updated_at=? WHERE id=?",
      [decision, now(), now(), disputeId],
    );
    await this.audit(
      d.order_id,
      "dispute",
      disputeId,
      "admin_decision",
      actor,
      d.status,
      "admin_decision_issued",
      { decision },
    );
    return this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
  }

  async recalculateShipmentPricing(
    shipmentId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const s = await this.one("SELECT * FROM shipments WHERE id=?", [
      shipmentId,
    ]);
    if (!s) throw new Error("Shipment not found");
    const total = calculateShipmentPricing({
      base: s.base_shipping_price,
      handling: s.extra_handling_fee,
      specialVehicle: s.special_vehicle_fee,
      insurance: s.insurance_fee,
      discount: s.shipping_discount_amount,
      tax: s.tax_amount,
    });
    if (total !== s.final_shipping_price) {
      await this.db.execute(
        "UPDATE shipments SET final_shipping_price=?,updated_at=? WHERE id=?",
        [total, now(), shipmentId],
      );
      await this.audit(
        s.order_id,
        "shipment",
        shipmentId,
        "shipping_fee_changed",
        actor,
        s.status,
        s.status,
        { finalShippingPrice: total },
      );
    }
    return total;
  }

  async recalculateShipmentStatus(
    shipmentId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const s = await this.one("SELECT * FROM shipments WHERE id=?", [
        shipmentId,
      ]),
      rows = await this.db.execute(
        "SELECT status FROM shipment_items WHERE shipment_id=?",
        [shipmentId],
      ),
      status = calculateShipmentStatus(rows.map((x) => String(x.status)));
    if (s && s.status !== status) {
      await this.db.execute(
        "UPDATE shipments SET status=?,updated_at=? WHERE id=?",
        [status, now(), shipmentId],
      );
      await this.audit(
        s.order_id,
        "shipment",
        shipmentId,
        "status_changed",
        actor,
        s.status,
        status,
      );
    }
    return status;
  }

  async recalculateSellerOrderStatus(
    sellerOrderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    const rows = [
        ...(await this.db.execute(
          "SELECT status FROM order_items WHERE seller_order_id=?",
          [sellerOrderId],
        )),
        ...(await this.db.execute(
          "SELECT status FROM custom_request_items WHERE seller_order_id=?",
          [sellerOrderId],
        )),
      ],
      status = calculateSellerOrderStatus(rows.map((x) => String(x.status)));
    if (so.status !== status) {
      await this.db.execute(
        "UPDATE seller_orders SET status=?,updated_at=? WHERE id=?",
        [status, now(), sellerOrderId],
      );
      await this.audit(
        so.order_id,
        "seller_order",
        sellerOrderId,
        "status_changed",
        actor,
        so.status,
        status,
      );
    }
    return status;
  }

  async recalculateSellerOrderPricing(
    sellerOrderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const old = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!old) throw new Error("Seller order not found");
    const rows = [
        ...(await this.db.execute(
          "SELECT subtotal_price subtotal,item_discount_amount+coupon_discount_amount discount,shipping_price-shipping_discount_amount shipping,tax_amount tax,commission_amount commission,total_price total FROM order_items WHERE seller_order_id=?",
          [sellerOrderId],
        )),
        ...(await this.db.execute(
          "SELECT subtotal_price subtotal,discount_amount discount,shipping_price-shipping_discount_amount shipping,tax_amount tax,commission_amount commission,total_price total FROM custom_request_items WHERE seller_order_id=?",
          [sellerOrderId],
        )),
      ],
      r = rows.reduce<{ subtotal: number; discount: number; shipping: number; tax: number; commission: number; total: number }>(
        (sum, row) => ({
          subtotal: sum.subtotal + Number(row.subtotal ?? 0),
          discount: sum.discount + Number(row.discount ?? 0),
          shipping: sum.shipping + Number(row.shipping ?? 0),
          tax: sum.tax + Number(row.tax ?? 0),
          commission: sum.commission + Number(row.commission ?? 0),
          total: sum.total + Number(row.total ?? 0),
        }),
        { subtotal: 0, discount: 0, shipping: 0, tax: 0, commission: 0, total: 0 },
      ),
      next = {
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        shipping: Number(r.shipping),
        tax: Number(r.tax),
        commission: Number(r.commission),
        total: Number(r.total),
        payout: Math.max(0, Number(r.total) - Number(r.commission)),
      };
    await this.db.execute(
      "UPDATE seller_orders SET seller_subtotal=?,seller_discount_total=?,seller_shipping_total=?,seller_tax_total=?,seller_commission_total=?,seller_grand_total=?,seller_payout_total=?,updated_at=? WHERE id=?",
      [
        next.subtotal,
        next.discount,
        next.shipping,
        next.tax,
        next.commission,
        next.total,
        next.payout,
        now(),
        sellerOrderId,
      ],
    );
    if (
      old.seller_grand_total !== next.total ||
      old.seller_payout_total !== next.payout
    )
      await this.audit(
        old.order_id,
        "seller_order",
        sellerOrderId,
        "price_changed",
        actor,
        old.status,
        old.status,
        next,
      );
    return next;
  }
}
