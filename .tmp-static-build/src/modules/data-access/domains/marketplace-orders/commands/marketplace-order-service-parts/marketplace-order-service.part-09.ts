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
import { MarketplaceOrderPart8 } from "./marketplace-order-service.part-08";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart9 extends MarketplaceOrderPart8 {
  async createUnifiedDeliveryShipment(planId: string, actor: Actor) {
    this.requireAdmin(actor);
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      planId,
    ]);
    if (!plan) throw new Error("Delivery plan not found");
    if (plan.status !== "accepted")
      throw new Error(
        "Unified delivery quote must be accepted before shipment",
      );
    if (
      await this.one(
        "SELECT shipment_id FROM delivery_plan_shipments WHERE plan_id=?",
        [planId],
      )
    )
      throw new Error("Delivery plan shipment already exists");
    const quotes = await this.db.execute(
      "SELECT * FROM delivery_plan_quotes WHERE plan_id=? AND status='accepted' ORDER BY created_at,id",
      [planId],
    );
    if (quotes.length === 0)
      throw new Error("Accepted delivery quote not found");
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')",
      [plan.order_id],
    );
    if (items.length === 0)
      throw new Error("Delivery plan has no active items");
    if (items.some((item) => String(item.status) !== "ready_for_shipping"))
      throw new Error("All seller items must be ready before unified shipment");
    const order = await this.one("SELECT * FROM orders WHERE id=?", [
        plan.order_id,
      ]),
      created: Row[] = [];
    for (const quote of quotes) {
      const quoteStops = await this.db.execute(
        "SELECT dps.seller_order_id FROM delivery_plan_stops dps JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=?",
        [quote.id],
      );
      const sellerOrderIds = quoteStops
        .map((stop) => stop.seller_order_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      const scopedItems =
        sellerOrderIds.length > 0
          ? await this.db.execute(
              `SELECT * FROM order_items WHERE seller_order_id IN (${sellerOrderIds.map(() => "?").join(",")}) AND status='ready_for_shipping' ORDER BY created_at,id`,
              sellerOrderIds,
            )
          : [];
      if (scopedItems.length === 0) continue;
      const stops = await this.db.execute(
        "SELECT dps.pickup_address_snapshot_json FROM delivery_plan_stops dps JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=? AND dps.status<>'cancelled' ORDER BY dps.pickup_sequence",
        [quote.id],
      );
      const shipment = await this.createShipment(
        plan.order_id,
        {
          direction: "outbound",
          carrierId: quote.provider_id,
          shippingMethod:
            quotes.length === 1
              ? "unified_multi_seller_delivery"
              : "hybrid_multi_seller_delivery",
          pickupAddress: {
            stops: stops.map((stop) =>
              JSON.parse(String(stop.pickup_address_snapshot_json || "{}")),
            ),
          },
          deliveryAddress: JSON.parse(
            String(order.delivery_address_snapshot_json || "{}"),
          ),
          base: quote.base_shipping_price,
          specialVehicleFee: quote.special_vehicle_fee,
        },
        actor,
      );
      for (const item of scopedItems)
        await this.assignToShipment(
          String(shipment.id),
          {
            itemType: "order_item",
            orderItemId: String(item.id),
            quantity: Number(item.quantity ?? 1),
          },
          actor,
        );
      await this.db.execute(
        "INSERT INTO delivery_plan_shipments (plan_id,shipment_id,quote_id,created_at) VALUES (?,?,?,?)",
        [planId, shipment.id, quote.id, now()],
      );
      created.push(shipment);
    }
    if (created.length === 0)
      throw new Error("Delivery plan has no shippable quote groups");
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plans SET status='completed',updated_at=? WHERE id=?",
      [ts, planId],
    );
    await this.audit(
      plan.order_id,
      "delivery_plan",
      planId,
      "status_changed",
      actor,
      "accepted",
      "completed",
      {
        shipmentIds: created.map((shipment) => shipment.id),
        shipmentCount: created.length,
        strategy: plan.strategy,
      },
    );
    return this.one("SELECT * FROM shipments WHERE id=?", [created[0].id]);
  }

  async requestShippingQuote(
    orderId: string,
    sellerOrderId: string,
    specialVehicleFee: number,
    actor: Actor,
  ) {
    const order = await this.requireBuyerOrder(orderId, actor),
      so = await this.one(
        "SELECT * FROM seller_orders WHERE id=? AND order_id=?",
        [sellerOrderId, orderId],
      );
    if (!so) throw new Error("Seller order not found");
    const existing = await this.one(
      "SELECT id FROM shipping_quotes WHERE seller_order_id=? LIMIT 1",
      [sellerOrderId],
    );
    if (existing) throw new Error("Shipping quote request already exists");
    const fee = Number(specialVehicleFee);
    if (!Number.isSafeInteger(fee) || fee < 0)
      throw new Error("invalid shipping vehicle fee");
    const quoteId = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO shipping_quotes (id,order_id,seller_order_id,seller_id,service_provider_id,buyer_id,version,base_shipping_price,special_vehicle_fee,total_shipping_price,status,created_at,updated_at) VALUES (?,?,?,?,?,?,1,0,?,?,'requested',?,?)",
      [
        quoteId,
        orderId,
        sellerOrderId,
        so.seller_id,
        so.service_provider_id ?? null,
        order.buyer_id,
        fee,
        fee,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "shipping_quote",
      quoteId,
      "created",
      actor,
      null,
      "requested",
      { sellerOrderId, specialVehicleFee: fee },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }

  protected async requireAcceptedShippingQuote(sellerOrderId: string) {
    const stop = await this.one(
      "SELECT plan_id FROM delivery_plan_stops WHERE seller_order_id=? LIMIT 1",
      [sellerOrderId],
    );
    const plan = stop
      ? await this.one("SELECT status FROM delivery_plans WHERE id=? LIMIT 1", [
          stop.plan_id,
        ])
      : null;
    if (
      plan &&
      ["collecting_quotes", "pending_buyer", "reprice_required"].includes(
        String(plan.status),
      )
    )
      throw new Error(
        "Unified delivery plan must be accepted or changed to separate delivery before processing",
      );
    if (plan && ["accepted", "completed"].includes(String(plan.status))) return;
    const requested = await this.one(
      "SELECT id FROM shipping_quotes WHERE seller_order_id=? LIMIT 1",
      [sellerOrderId],
    );
    if (!requested) return;
    const accepted = await this.one(
      "SELECT id FROM shipping_quotes WHERE seller_order_id=? AND status='accepted' LIMIT 1",
      [sellerOrderId],
    );
    if (!accepted)
      throw new Error("Shipping quote must be accepted before processing");
  }

  protected async reconcileShippingQuoteAfterItemCancellation(
    sellerOrderId: string,
    actor: Actor,
  ) {
    const activeItem = await this.one(
      "SELECT id FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC LIMIT 1",
      [sellerOrderId],
    );
    if (!activeItem) {
      await this.db.execute(
        "UPDATE shipping_quotes SET status='cancelled',responded_at=?,updated_at=? WHERE seller_order_id=? AND status IN ('requested','pending_buyer','rejected','expired')",
        [now(), now(), sellerOrderId],
      );
      return;
    }
    const accepted = await this.one(
      "SELECT * FROM shipping_quotes WHERE seller_order_id=? AND status='accepted' LIMIT 1",
      [sellerOrderId],
    );
    if (accepted) await this.applyAcceptedShippingQuote(accepted, actor);
  }
}
