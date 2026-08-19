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
import { MarketplaceOrderPart6 } from "./marketplace-order-service.part-06";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart7 extends MarketplaceOrderPart6 {
  async proposeUnifiedDeliveryQuote(planId: string, input: any, actor: Actor) {
    if (actor.role !== "service_provider" && actor.role !== "admin")
      throw new Error("Delivery provider only");
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      planId,
    ]);
    if (!plan) throw new Error("Delivery plan not found");
    if (
      !["collecting_quotes", "pending_buyer", "reprice_required"].includes(
        plan.status,
      )
    )
      throw new Error("Delivery plan is not accepting quotes");
    if (actor.role !== "admin") {
      const candidate = await this.one(
        "SELECT * FROM delivery_plan_candidates WHERE plan_id=? AND provider_id=?",
        [planId, actor.id],
      );
      if (!candidate) throw new Error("Forbidden");
    }
    const pending = await this.one(
      "SELECT id FROM delivery_plan_quotes WHERE plan_id=? AND provider_id=? AND status='pending_buyer'",
      [planId, actor.id],
    );
    if (pending)
      throw new Error("A delivery quote is already pending buyer approval");
    const coveredStops =
      actor.role === "admin"
        ? await this.db.execute(
            "SELECT id stop_id FROM delivery_plan_stops WHERE plan_id=? AND status<>'cancelled'",
            [planId],
          )
        : await this.db.execute(
            "SELECT dpcs.stop_id FROM delivery_plan_candidate_stops dpcs JOIN delivery_plan_stops dps ON dps.id=dpcs.stop_id WHERE dpcs.plan_id=? AND dpcs.provider_id=? AND dps.status<>'cancelled'",
            [planId, actor.id],
          );
    if (coveredStops.length === 0)
      throw new Error("Delivery provider has no active pickup stops");
    const placeholders = coveredStops.map(() => "?").join(","),
      coveredIds = coveredStops.map((stop) => String(stop.stop_id));
    const scopedStops = await this.db.execute(
      `SELECT seller_order_id FROM delivery_plan_stops WHERE id IN (${placeholders})`,
      coveredIds,
    );
    const sellerOrderIds = scopedStops
      .map((stop) => stop.seller_order_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    const scopeItems =
      sellerOrderIds.length > 0
        ? await this.db.execute(
            `SELECT requires_special_vehicle FROM order_items WHERE seller_order_id IN (${sellerOrderIds.map(() => "?").join(",")}) AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')`,
            sellerOrderIds,
          )
        : [];
    const scopeTransport = {
      special: scopeItems.some((item) => Number(item.requires_special_vehicle) > 0) ? 1 : 0,
    };
    const base = Number(input.baseShippingPrice),
      vehicle = Number(input.specialVehicleFee ?? 0);
    if (
      !Number.isSafeInteger(base) ||
      base < 0 ||
      !Number.isSafeInteger(vehicle) ||
      vehicle < 0
    )
      throw new Error("invalid delivery quote");
    if (!scopeTransport?.special && vehicle !== 0)
      throw new Error(
        "Special vehicle fee is not allowed for this delivery quote",
      );
    const total = base + vehicle;
    if (!Number.isSafeInteger(total)) throw new Error("invalid delivery quote");
    const latest = await this.one(
      "SELECT COALESCE(MAX(version),0) version FROM delivery_plan_quotes WHERE plan_id=? AND provider_id=?",
      [planId, actor.id],
    );
    const quoteId = id(),
      ts = now(),
      notes =
        String(input.notes ?? "")
          .trim()
          .slice(0, 1000) || null,
      expiresAt = input.expiresAt ? String(input.expiresAt) : null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now())
      throw new Error("Delivery quote expiry must be in the future");
    await this.db.execute(
      "INSERT INTO delivery_plan_quotes (id,plan_id,order_id,provider_id,version,base_shipping_price,special_vehicle_fee,total_shipping_price,status,notes,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'pending_buyer',?,?,?,?)",
      [
        quoteId,
        planId,
        plan.order_id,
        actor.id,
        Number(latest?.version ?? 0) + 1,
        base,
        vehicle,
        total,
        notes,
        expiresAt,
        ts,
        ts,
      ],
    );
    for (const stopId of coveredIds)
      await this.db.execute(
        "INSERT INTO delivery_plan_quote_stops (quote_id,plan_id,stop_id,created_at) VALUES (?,?,?,?)",
        [quoteId, planId, stopId, ts],
      );
    await this.db.execute(
      "UPDATE delivery_plan_candidates SET status='quoted',updated_at=? WHERE plan_id=? AND provider_id=?",
      [ts, planId, actor.id],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET status='pending_buyer',updated_at=? WHERE id=?",
      [ts, planId],
    );
    await this.audit(
      plan.order_id,
      "delivery_plan_quote",
      quoteId,
      "shipping_fee_changed",
      actor,
      null,
      "pending_buyer",
      {
        planId,
        baseShippingPrice: base,
        specialVehicleFee: vehicle,
        totalShippingPrice: total,
        coveredStopCount: coveredIds.length,
      },
    );
    return this.one("SELECT * FROM delivery_plan_quotes WHERE id=?", [quoteId]);
  }

  async acceptUnifiedDeliveryQuote(quoteId: string, actor: Actor) {
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
    if (
      !plan ||
      !["pending_buyer", "reprice_required", "collecting_quotes"].includes(
        plan.status,
      ) ||
      quote.status !== "pending_buyer"
    )
      throw new Error("Delivery quote is not awaiting buyer approval");
    if (quote.expires_at && new Date(quote.expires_at).getTime() <= Date.now())
      throw new Error("Delivery quote expired");
    const ts = now();
    const conflict = await this.one(
      "SELECT aq.id FROM delivery_plan_quotes aq JOIN delivery_plan_quote_stops aqs ON aqs.quote_id=aq.id JOIN delivery_plan_quote_stops incoming ON incoming.stop_id=aqs.stop_id WHERE aq.plan_id=? AND aq.status='accepted' AND incoming.quote_id=? LIMIT 1",
      [plan.id, quoteId],
    );
    if (conflict)
      throw new Error(
        "Delivery quote overlaps an already accepted pickup group",
      );
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status='accepted',responded_at=?,updated_at=? WHERE id=? AND status='pending_buyer'",
      [ts, ts, quoteId],
    );
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status='rejected',responded_at=?,updated_at=? WHERE plan_id=? AND status='pending_buyer' AND id<>? AND EXISTS (SELECT 1 FROM delivery_plan_quote_stops other JOIN delivery_plan_quote_stops chosen ON chosen.stop_id=other.stop_id WHERE other.quote_id=delivery_plan_quotes.id AND chosen.quote_id=?)",
      [ts, ts, plan.id, quoteId, quoteId],
    );
    const coverage = await this.one(
      "SELECT COUNT(DISTINCT dps.id) total,COUNT(DISTINCT CASE WHEN aq.id IS NOT NULL THEN dps.id END) covered FROM delivery_plan_stops dps LEFT JOIN delivery_plan_quote_stops aqs ON aqs.stop_id=dps.id LEFT JOIN delivery_plan_quotes aq ON aq.id=aqs.quote_id AND aq.status='accepted' WHERE dps.plan_id=? AND dps.status<>'cancelled'",
      [plan.id],
    );
    const fullyCovered =
      Number(coverage?.total ?? 0) > 0 &&
      Number(coverage?.covered ?? 0) === Number(coverage?.total ?? 0);
    const acceptedCount = Number(
      (
        await this.one(
          "SELECT COUNT(*) count FROM delivery_plan_quotes WHERE plan_id=? AND status='accepted'",
          [plan.id],
        )
      )?.count ?? 0,
    );
    const nextStatus = fullyCovered ? "accepted" : "pending_buyer",
      strategy = fullyCovered && acceptedCount === 1 ? "unified" : "hybrid",
      selected = fullyCovered && acceptedCount === 1 ? quoteId : null;
    await this.db.execute(
      "UPDATE delivery_plans SET status=?,strategy=?,selected_quote_id=?,updated_at=? WHERE id=?",
      [nextStatus, strategy, selected, ts, plan.id],
    );
    if (fullyCovered)
      await this.applyAcceptedDeliveryPlanPrices(
        { ...plan, status: nextStatus, strategy },
        actor,
      );
    await this.audit(
      quote.order_id,
      "delivery_plan",
      plan.id,
      "accepted",
      actor,
      plan.status,
      nextStatus,
      {
        quoteId,
        providerId: quote.provider_id,
        totalShippingPrice: quote.total_shipping_price,
        fullyCovered,
        acceptedQuoteCount: acceptedCount,
        strategy,
      },
    );
    return this.one("SELECT * FROM delivery_plans WHERE id=?", [plan.id]);
  }
}
