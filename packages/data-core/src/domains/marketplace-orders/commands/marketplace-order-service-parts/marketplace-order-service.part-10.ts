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
import { MarketplaceOrderPart9 } from "./marketplace-order-service.part-09";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart10 extends MarketplaceOrderPart9 {
  async proposeShippingQuote(sellerOrderId: string, input: any, actor: Actor) {
    this.sellerActor(actor);
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    if (
      actor.role !== "admin" &&
      actor.id !== so.seller_id &&
      actor.id !== so.service_provider_id
    )
      throw new Error("Forbidden");
    const latest = await this.one(
      "SELECT * FROM shipping_quotes WHERE seller_order_id=? ORDER BY version DESC LIMIT 1",
      [sellerOrderId],
    );
    if (!latest) throw new Error("Shipping quote was not requested");
    if (latest.status === "pending_buyer")
      throw new Error("A shipping quote is already pending buyer approval");
    if (latest.status === "accepted")
      throw new Error("Accepted shipping quote cannot be replaced");
    const base = Number(input.baseShippingPrice);
    if (!Number.isSafeInteger(base) || base < 0)
      throw new Error("invalid shipping quote");
    const notes =
      String(input.notes ?? "")
        .trim()
        .slice(0, 1000) || null;
    const expiresAt = input.expiresAt ? String(input.expiresAt) : null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now())
      throw new Error("Shipping quote expiry must be in the future");
    const ts = now(),
      total = base + Number(latest.special_vehicle_fee ?? 0);
    if (!Number.isSafeInteger(total)) throw new Error("invalid shipping quote");
    const proposerRole =
      actor.role === "admin"
        ? "admin"
        : actor.id === so.service_provider_id
          ? "service_provider"
          : "seller";
    let quoteId = String(latest.id);
    if (latest.status === "requested") {
      await this.db.execute(
        "UPDATE shipping_quotes SET proposed_by=?,proposed_by_role=?,base_shipping_price=?,total_shipping_price=?,status='pending_buyer',notes=?,expires_at=?,updated_at=? WHERE id=?",
        [actor.id, proposerRole, base, total, notes, expiresAt, ts, quoteId],
      );
    } else {
      quoteId = id();
      await this.db.execute(
        "INSERT INTO shipping_quotes (id,order_id,seller_order_id,seller_id,service_provider_id,buyer_id,version,proposed_by,proposed_by_role,base_shipping_price,special_vehicle_fee,total_shipping_price,status,notes,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending_buyer',?,?,?,?)",
        [
          quoteId,
          latest.order_id,
          sellerOrderId,
          so.seller_id,
          so.service_provider_id ?? null,
          latest.buyer_id,
          Number(latest.version) + 1,
          actor.id,
          proposerRole,
          base,
          Number(latest.special_vehicle_fee ?? 0),
          total,
          notes,
          expiresAt,
          ts,
          ts,
        ],
      );
    }
    await this.audit(
      latest.order_id,
      "shipping_quote",
      quoteId,
      "shipping_fee_changed",
      actor,
      latest.status,
      "pending_buyer",
      {
        baseShippingPrice: base,
        specialVehicleFee: Number(latest.special_vehicle_fee ?? 0),
        totalShippingPrice: total,
        version:
          latest.status === "requested"
            ? latest.version
            : Number(latest.version) + 1,
      },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }

  protected async applyAcceptedShippingQuote(quote: Row, actor: Actor) {
    const item = await this.one(
      "SELECT * FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC LIMIT 1",
      [quote.seller_order_id],
    );
    if (!item) throw new Error("Shipping quote has no active product item");
    await this.setOrderItemShipping(item, Number(quote.total_shipping_price));
    await this.recalculateAll(quote.order_id, actor);
  }

  async acceptShippingQuote(quoteId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const quote = await this.one("SELECT * FROM shipping_quotes WHERE id=?", [
      quoteId,
    ]);
    if (!quote) throw new Error("Shipping quote not found");
    await this.requireBuyerOrder(quote.order_id, actor);
    if (quote.status !== "pending_buyer")
      throw new Error("Shipping quote is not awaiting buyer approval");
    if (quote.expires_at && new Date(quote.expires_at).getTime() <= Date.now())
      throw new Error("Shipping quote expired");
    const ts = now();
    await this.db.execute(
      "UPDATE shipping_quotes SET status='accepted',responded_at=?,updated_at=? WHERE id=? AND status='pending_buyer'",
      [ts, ts, quoteId],
    );
    await this.applyAcceptedShippingQuote(
      { ...quote, status: "accepted" },
      actor,
    );
    await this.audit(
      quote.order_id,
      "shipping_quote",
      quoteId,
      "accepted",
      actor,
      "pending_buyer",
      "accepted",
      {
        totalShippingPrice: quote.total_shipping_price,
        version: quote.version,
      },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }

  async rejectShippingQuote(quoteId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const quote = await this.one("SELECT * FROM shipping_quotes WHERE id=?", [
      quoteId,
    ]);
    if (!quote) throw new Error("Shipping quote not found");
    await this.requireBuyerOrder(quote.order_id, actor);
    if (quote.status !== "pending_buyer")
      throw new Error("Shipping quote is not awaiting buyer approval");
    const ts = now();
    await this.db.execute(
      "UPDATE shipping_quotes SET status='rejected',responded_at=?,updated_at=? WHERE id=? AND status='pending_buyer'",
      [ts, ts, quoteId],
    );
    await this.audit(
      quote.order_id,
      "shipping_quote",
      quoteId,
      "rejected",
      actor,
      "pending_buyer",
      "rejected",
      {
        totalShippingPrice: quote.total_shipping_price,
        version: quote.version,
      },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }

  async createShipment(orderId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const order = await this.one("SELECT id FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    if (input.sellerOrderId)
      await this.requireAcceptedShippingQuote(input.sellerOrderId);
    const sid = id(),
      ts = now(),
      finalPrice = calculateShipmentPricing({
        base: input.base ?? 0,
        handling: input.handling ?? 0,
        specialVehicle: input.specialVehicleFee ?? 0,
        insurance: input.insurance ?? 0,
        discount: input.discount ?? 0,
        tax: input.tax ?? 0,
      });
    await this.db.execute(
      "INSERT INTO shipments (id,order_id,direction,carrier_id,carrier_company_name,tracking_number,shipping_method,pickup_address_snapshot_json,delivery_address_snapshot_json,expected_delivery_at,base_shipping_price,extra_handling_fee,special_vehicle_fee,insurance_fee,shipping_discount_amount,tax_amount,final_shipping_price,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        sid,
        orderId,
        input.direction ?? "outbound",
        input.carrierId ?? null,
        input.carrierCompanyName ?? null,
        input.trackingNumber ?? null,
        input.shippingMethod,
        JSON.stringify(input.pickupAddress ?? {}),
        JSON.stringify(input.deliveryAddress ?? {}),
        input.expectedDeliveryAt ?? null,
        input.base ?? 0,
        input.handling ?? 0,
        input.specialVehicleFee ?? 0,
        input.insurance ?? 0,
        input.discount ?? 0,
        input.tax ?? 0,
        finalPrice,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "shipment",
      sid,
      "created",
      actor,
      null,
      "waiting_for_carrier_pickup",
      { finalShippingPrice: finalPrice },
    );
    return this.one("SELECT * FROM shipments WHERE id=?", [sid]);
  }
}
