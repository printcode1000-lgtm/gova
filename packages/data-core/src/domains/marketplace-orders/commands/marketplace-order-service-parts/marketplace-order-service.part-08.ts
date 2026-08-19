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
import { MarketplaceOrderPart7 } from "./marketplace-order-service.part-07";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart8 extends MarketplaceOrderPart7 {
  async rejectUnifiedDeliveryQuote(quoteId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const quote = await this.one(
      "SELECT * FROM delivery_plan_quotes WHERE id=?",
      [quoteId],
    );
    if (!quote) throw new Error("Delivery quote not found");
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      quote.plan_id,
    ]);
    await this.requireBuyerOrder(quote.order_id, actor);
    if (!plan || quote.status !== "pending_buyer")
      throw new Error("Delivery quote is not awaiting buyer approval");
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status='rejected',responded_at=?,updated_at=? WHERE id=?",
      [ts, ts, quoteId],
    );
    const remaining = await this.one(
      "SELECT id FROM delivery_plan_quotes WHERE plan_id=? AND status='pending_buyer' LIMIT 1",
      [plan.id],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET status=?,updated_at=? WHERE id=?",
      [remaining ? "pending_buyer" : "collecting_quotes", ts, plan.id],
    );
    await this.audit(
      quote.order_id,
      "delivery_plan_quote",
      quoteId,
      "rejected",
      actor,
      "pending_buyer",
      "rejected",
      {
        providerId: quote.provider_id,
        totalShippingPrice: quote.total_shipping_price,
      },
    );
    return this.one("SELECT * FROM delivery_plan_quotes WHERE id=?", [quoteId]);
  }

  async chooseSeparateDelivery(planId: string, actor: Actor) {
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      planId,
    ]);
    if (!plan) throw new Error("Delivery plan not found");
    await this.requireBuyerOrder(plan.order_id, actor);
    if (["cancelled", "completed", "separate_selected"].includes(plan.status))
      throw new Error("Delivery plan cannot switch to separate delivery");
    if (!plan.fallback_available)
      throw new Error(
        "Separate delivery is unavailable because a seller has no linked delivery provider",
      );
    const shipment = await this.one(
      "SELECT shipment_id FROM delivery_plan_shipments WHERE plan_id=?",
      [planId],
    );
    if (shipment) throw new Error("Delivery plan already has a shipment");
    const payment = await this.one(
      "SELECT id FROM payments WHERE order_id=? AND status IN ('partially_paid','fully_paid') LIMIT 1",
      [plan.order_id],
    );
    if (payment) throw new Error("Paid delivery plan cannot be changed");
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')",
      [plan.order_id],
    );
    for (const item of items) await this.setOrderItemShipping(item, 0);
    const stops = await this.db.execute(
      "SELECT * FROM delivery_plan_stops WHERE plan_id=? ORDER BY pickup_sequence",
      [planId],
    );
    for (const stop of stops) {
      await this.db.execute(
        "UPDATE seller_orders SET service_provider_id=?,updated_at=? WHERE id=?",
        [stop.original_carrier_id ?? null, now(), stop.seller_order_id],
      );
      const item = await this.one(
        "SELECT * FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC,id ASC LIMIT 1",
        [stop.seller_order_id],
      );
      if (!item) continue;
      await this.db.execute(
        "UPDATE order_items SET shipping_notes=?,updated_at=? WHERE seller_order_id=?",
        [
          stop.original_carrier_id
            ? `carrier:${stop.original_carrier_id}`
            : null,
          now(),
          stop.seller_order_id,
        ],
      );
      await this.setOrderItemShipping(
        item,
        Number(stop.fallback_shipping_price),
      );
      if (stop.requires_location_quote) {
        const existing = await this.one(
          "SELECT id FROM shipping_quotes WHERE seller_order_id=? LIMIT 1",
          [stop.seller_order_id],
        );
        if (!existing)
          await this.requestShippingQuote(
            plan.order_id,
            String(stop.seller_order_id),
            Number(stop.fallback_special_vehicle_fee),
            actor,
          );
      }
    }
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status=CASE WHEN status='accepted' THEN 'superseded' WHEN status='pending_buyer' THEN 'rejected' ELSE status END,responded_at=CASE WHEN status IN ('accepted','pending_buyer') THEN ? ELSE responded_at END,updated_at=? WHERE plan_id=?",
      [ts, ts, planId],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET strategy='separate',status='separate_selected',selected_quote_id=NULL,updated_at=? WHERE id=?",
      [ts, planId],
    );
    await this.recalculateAll(plan.order_id, actor);
    await this.audit(
      plan.order_id,
      "delivery_plan",
      planId,
      "updated",
      actor,
      plan.status,
      "separate_selected",
      { strategy: "separate" },
    );
    return this.one("SELECT * FROM delivery_plans WHERE id=?", [planId]);
  }
}
