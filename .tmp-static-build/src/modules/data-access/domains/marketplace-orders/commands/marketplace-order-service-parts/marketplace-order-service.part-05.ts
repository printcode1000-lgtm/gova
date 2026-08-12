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
import { MarketplaceOrderPart4 } from "./marketplace-order-service.part-04";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart5 extends MarketplaceOrderPart4 {
  async buyerRejectDeliveryItem(itemId: string, reason: string, actor: Actor) {
    const item = await this.one("SELECT * FROM order_items WHERE id=?", [
      itemId,
    ]);
    if (!item) throw new Error("Item not found");
    await this.requireBuyerOrder(item.order_id, actor);
    if (!["assigned_to_shipment", "in_transit"].includes(item.status))
      throw new Error(
        "Delivery can be rejected only while the item is with delivery",
      );
    const ts = now();
    await this.db.execute(
      "UPDATE shipment_items SET status='delivery_rejected',updated_at=? WHERE order_item_id=? AND status NOT IN ('delivered','closed')",
      [ts, itemId],
    );
    return this.setItemStatus(
      "order_items",
      itemId,
      "delivery_rejected",
      actor,
      "delivery_rejected",
      reason,
    );
  }

  async buyerRejectSellerDelivery(
    sellerOrderId: string,
    reason: string,
    actor: Actor,
  ) {
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    await this.requireBuyerOrder(so.order_id, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM order_items WHERE seller_order_id=? AND status IN ('assigned_to_shipment','in_transit')",
      [sellerOrderId],
    ))
      await this.buyerRejectDeliveryItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM seller_orders WHERE id=?", [sellerOrderId]);
  }

  async buyerRejectOrderDelivery(
    orderId: string,
    reason: string,
    actor: Actor,
  ) {
    await this.requireBuyerOrder(orderId, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM order_items WHERE order_id=? AND status IN ('assigned_to_shipment','in_transit')",
      [orderId],
    ))
      await this.buyerRejectDeliveryItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM orders WHERE id=?", [orderId]);
  }

  async createUnifiedDeliveryPlan(orderId: string, input: any, actor: Actor) {
    const order = await this.requireBuyerOrder(orderId, actor);
    const existing = await this.one(
      "SELECT id FROM delivery_plans WHERE order_id=?",
      [orderId],
    );
    if (existing) throw new Error("Delivery plan already exists");
    const stops = Array.isArray(input.stops) ? input.stops : [],
      candidates = Array.isArray(input.candidates) ? input.candidates : [];
    if (stops.length < 2)
      throw new Error("Unified delivery requires at least two sellers");
    if (candidates.length < 1)
      throw new Error("Unified delivery requires a qualified provider");
    const sellerOrders = await this.db.execute(
      "SELECT * FROM seller_orders WHERE order_id=?",
      [orderId],
    );
    const byId = new Map(sellerOrders.map((row) => [String(row.id), row]));
    const seenStops = new Set<string>(),
      planId = id(),
      ts = now();
    let fallback = 0,
      special = false,
      pending = false;
    for (const stop of stops) {
      const sellerOrderId = String(stop.sellerOrderId ?? ""),
        sellerOrder = byId.get(sellerOrderId);
      if (
        !sellerOrder ||
        seenStops.has(sellerOrderId) ||
        String(sellerOrder.seller_id) !== String(stop.sellerId)
      )
        throw new Error("Invalid delivery plan stop");
      seenStops.add(sellerOrderId);
      const value = Number(stop.fallbackShippingPrice),
        vehicle = Number(stop.fallbackSpecialVehicleFee ?? 0);
      if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        !Number.isSafeInteger(vehicle) ||
        vehicle < 0
      )
        throw new Error("invalid delivery plan money");
      fallback += value;
      if (!Number.isSafeInteger(fallback))
        throw new Error("invalid delivery plan money");
      special = special || stop.requiresSpecialVehicle === true;
      pending = pending || stop.requiresLocationQuote === true;
    }
    const fallbackAvailable = stops.every((stop: any) =>
      Boolean(stop.originalCarrierId),
    );
    await this.db.execute(
      "INSERT INTO delivery_plans (id,order_id,buyer_id,strategy,status,fallback_confirmed_price,fallback_has_pending_quotes,fallback_available,special_vehicle_required,seller_count,currency,created_at,updated_at) VALUES (?,?,?,'unified','collecting_quotes',?,?,?,?,?,?,?,?)",
      [
        planId,
        orderId,
        order.buyer_id,
        fallback,
        pending ? 1 : 0,
        fallbackAvailable ? 1 : 0,
        special ? 1 : 0,
        stops.length,
        order.currency,
        ts,
        ts,
      ],
    );
    const stopIdsBySeller = new Map<string, string>();
    for (const [index, stop] of stops.entries()) {
      const stopId = id();
      stopIdsBySeller.set(String(stop.sellerId), stopId);
      await this.db.execute(
        "INSERT INTO delivery_plan_stops (id,plan_id,order_id,seller_order_id,seller_id,original_carrier_id,pickup_address_snapshot_json,requires_location_quote,fallback_shipping_price,fallback_special_vehicle_fee,pickup_sequence,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          stopId,
          planId,
          orderId,
          stop.sellerOrderId,
          stop.sellerId,
          stop.originalCarrierId ?? null,
          JSON.stringify(stop.pickupAddress ?? {}),
          stop.requiresLocationQuote ? 1 : 0,
          stop.fallbackShippingPrice,
          stop.fallbackSpecialVehicleFee ?? 0,
          index,
          ts,
          ts,
        ],
      );
    }
    const uniqueCandidates = new Map<string, any>();
    for (const candidate of candidates) {
      const providerId = String(candidate.providerId ?? "").trim();
      if (providerId && !uniqueCandidates.has(providerId))
        uniqueCandidates.set(providerId, candidate);
    }
    if (uniqueCandidates.size === 0)
      throw new Error("Unified delivery requires a qualified provider");
    for (const [providerId, candidate] of uniqueCandidates) {
      const source =
          candidate.source === "linked" ? "linked" : "qualified_network",
        score = Math.max(0, Math.floor(Number(candidate.coverageScore) || 0));
      await this.db.execute(
        "INSERT INTO delivery_plan_candidates (plan_id,provider_id,source,coverage_score,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        [planId, providerId, source, score, ts, ts],
      );
      const coveredSellerIds =
        Array.isArray(candidate.sellerIds) && candidate.sellerIds.length > 0
          ? candidate.sellerIds.map(String)
          : stops.map((stop: any) => String(stop.sellerId));
      const coveredStopIds = Array.from(
        new Set(
          coveredSellerIds
            .map((sellerId: string) => stopIdsBySeller.get(sellerId))
            .filter(Boolean),
        ),
      ) as string[];
      if (coveredStopIds.length === 0)
        throw new Error(
          "Delivery provider candidate must cover at least one seller",
        );
      for (const stopId of coveredStopIds)
        await this.db.execute(
          "INSERT INTO delivery_plan_candidate_stops (plan_id,provider_id,stop_id,created_at) VALUES (?,?,?,?)",
          [planId, providerId, stopId, ts],
        );
    }
    await this.audit(
      orderId,
      "delivery_plan",
      planId,
      "created",
      actor,
      null,
      "collecting_quotes",
      {
        strategy: "unified",
        sellerCount: stops.length,
        candidateCount: uniqueCandidates.size,
        fallbackConfirmedPrice: fallback,
      },
    );
    return this.one("SELECT * FROM delivery_plans WHERE id=?", [planId]);
  }

  protected async setOrderItemShipping(item: Row, shipping: number) {
    const total = Math.max(
      0,
      Number(item.subtotal_price) -
        Number(item.item_discount_amount) -
        Number(item.coupon_discount_amount) +
        shipping -
        Number(item.shipping_discount_amount) +
        Number(item.tax_amount) +
        Number(item.service_fee_amount) +
        Number(item.commission_amount),
    );
    const remaining = Math.max(
      0,
      total - Number(item.paid_amount) + Number(item.refunded_amount),
    );
    await this.db.execute(
      "UPDATE order_items SET shipping_price=?,total_price=?,remaining_amount=?,updated_at=? WHERE id=?",
      [shipping, total, remaining, now(), item.id],
    );
  }
}
