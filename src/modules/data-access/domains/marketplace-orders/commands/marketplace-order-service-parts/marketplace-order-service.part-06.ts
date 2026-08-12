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
import { MarketplaceOrderPart5 } from "./marketplace-order-service.part-05";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart6 extends MarketplaceOrderPart5 {
  protected async reconcileDeliveryPlanAfterItemCancellation(
    orderId: string,
    sellerOrderId: string,
    actor: Actor,
  ) {
    const plan = await this.one(
      "SELECT * FROM delivery_plans WHERE order_id=?",
      [orderId],
    );
    if (
      !plan ||
      ["separate_selected", "cancelled", "completed"].includes(
        String(plan.status),
      )
    )
      return;
    const sellerActive = await this.one(
      "SELECT id FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') LIMIT 1",
      [sellerOrderId],
    );
    if (sellerActive) {
      if (plan.status === "accepted") {
        await this.applyAcceptedDeliveryPlanPrices(plan, actor);
      }
      return;
    }
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plan_stops SET status='cancelled',updated_at=? WHERE plan_id=? AND seller_order_id=?",
      [ts, plan.id, sellerOrderId],
    );
    const activeStops = Number(
      (
        await this.one(
          "SELECT COUNT(*) count FROM delivery_plan_stops WHERE plan_id=? AND status<>'cancelled'",
          [plan.id],
        )
      )?.count ?? 0,
    );
    if (activeStops === 0) {
      await this.db.execute(
        "UPDATE delivery_plan_quotes SET status=CASE WHEN status='accepted' THEN 'superseded' WHEN status='pending_buyer' THEN 'rejected' ELSE status END,responded_at=CASE WHEN status IN ('accepted','pending_buyer') THEN ? ELSE responded_at END,updated_at=? WHERE plan_id=?",
        [ts, ts, plan.id],
      );
      await this.db.execute(
        "UPDATE delivery_plans SET status='cancelled',selected_quote_id=NULL,seller_count=0,updated_at=? WHERE id=?",
        [ts, plan.id],
      );
      await this.recalculateAll(orderId, actor);
      await this.audit(
        orderId,
        "delivery_plan",
        plan.id,
        "cancelled",
        actor,
        plan.status,
        "cancelled",
        { reason: "all_delivery_stops_cancelled" },
      );
      return;
    }
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')",
      [orderId],
    );
    for (const item of items) await this.setOrderItemShipping(item, 0);
    const fallback = await this.one(
      "SELECT COALESCE(SUM(fallback_shipping_price),0) price,MAX(requires_location_quote) pending,MIN(CASE WHEN original_carrier_id IS NULL OR original_carrier_id='' THEN 0 ELSE 1 END) available FROM delivery_plan_stops WHERE plan_id=? AND status<>'cancelled'",
      [plan.id],
    );
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status=CASE WHEN status='accepted' THEN 'superseded' WHEN status='pending_buyer' THEN 'rejected' ELSE status END,responded_at=CASE WHEN status IN ('accepted','pending_buyer') THEN ? ELSE responded_at END,updated_at=? WHERE plan_id=?",
      [ts, ts, plan.id],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET status='reprice_required',selected_quote_id=NULL,seller_count=?,fallback_confirmed_price=?,fallback_has_pending_quotes=?,fallback_available=?,updated_at=? WHERE id=?",
      [
        activeStops,
        Number(fallback?.price ?? 0),
        Number(fallback?.pending ?? 0),
        Number(fallback?.available ?? 0),
        ts,
        plan.id,
      ],
    );
    await this.recalculateAll(orderId, actor);
    await this.audit(
      orderId,
      "delivery_plan",
      plan.id,
      "updated",
      actor,
      plan.status,
      "reprice_required",
      { reason: "seller_stop_cancelled", sellerOrderId, activeStops },
    );
  }

  protected async applyAcceptedDeliveryPlanPrices(plan: Row, actor: Actor) {
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC,id ASC",
      [plan.order_id],
    );
    if (items.length === 0)
      throw new Error("Delivery plan has no active product items");
    for (const item of items) await this.setOrderItemShipping(item, 0);
    const quotes = await this.db.execute(
      "SELECT * FROM delivery_plan_quotes WHERE plan_id=? AND status='accepted' ORDER BY created_at,id",
      [plan.id],
    );
    if (quotes.length === 0)
      throw new Error("Accepted delivery quote not found");
    for (const quote of quotes) {
      const quoteStops = await this.db.execute(
        "SELECT dps.seller_order_id FROM delivery_plan_stops dps JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=?",
        [quote.id],
      );
      const sellerOrderIds = quoteStops
        .map((stop) => stop.seller_order_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      if (sellerOrderIds.length === 0) continue;
      const sellerOrderPlaceholders = sellerOrderIds.map(() => "?").join(",");
      const scopedItem = await this.one(
        `SELECT * FROM order_items WHERE seller_order_id IN (${sellerOrderPlaceholders}) AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at,id LIMIT 1`,
        sellerOrderIds,
      );
      if (!scopedItem) continue;
      await this.setOrderItemShipping(
        scopedItem,
        Number(quote.total_shipping_price),
      );
      await this.db.execute(
        `UPDATE seller_orders SET service_provider_id=?,updated_at=? WHERE id IN (${sellerOrderPlaceholders})`,
        [quote.provider_id, now(), ...sellerOrderIds],
      );
      await this.db.execute(
        `UPDATE order_items SET shipping_notes=?,updated_at=? WHERE seller_order_id IN (${sellerOrderPlaceholders})`,
        [
          `carrier:${quote.provider_id};delivery-plan:${plan.id};delivery-quote:${quote.id}`,
          now(),
          ...sellerOrderIds,
        ],
      );
    }
    await this.db.execute(
      "UPDATE shipping_quotes SET status='cancelled',responded_at=?,updated_at=? WHERE order_id=? AND status IN ('requested','pending_buyer','rejected','expired')",
      [now(), now(), plan.order_id],
    );
    await this.recalculateAll(plan.order_id, actor);
  }
}
