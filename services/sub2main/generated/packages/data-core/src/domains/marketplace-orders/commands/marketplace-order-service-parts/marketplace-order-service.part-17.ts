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
import { MarketplaceOrderPart16 } from "./marketplace-order-service.part-16";
import {
  parseSellerFulfillmentSnapshot,
  serializeSellerFulfillmentSnapshot,
  type SellerFulfillmentSnapshot,
} from "@asol/orders-core";
import { calculateSellerShippingFromSnapshot } from "@asol/orders-core";
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

  async assignSellerOrderCarrier(
    sellerOrderId: string,
    carrierUid: string,
    actor: Actor,
  ) {
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    if (
      actor.role !== "admin" &&
      (actor.role !== "seller" || actor.id !== so.seller_id)
    ) {
      throw new Error("Forbidden");
    }
    if (so.service_provider_id) {
      throw new Error("Seller order already has a carrier");
    }
    const deliveryStop = await this.one(
      "SELECT plan_id FROM delivery_plan_stops WHERE seller_order_id=? LIMIT 1",
      [sellerOrderId],
    );
    if (deliveryStop) {
      const plan = await this.one(
        "SELECT status FROM delivery_plans WHERE id=? LIMIT 1",
        [deliveryStop.plan_id],
      );
      if (
        plan &&
        !["separate_selected", "cancelled"].includes(String(plan.status))
      ) {
        throw new Error("Use the unified delivery plan for this seller order");
      }
    }
    const carrier = String(carrierUid ?? "").trim();
    if (!carrier) throw new Error("carrierUid is required");
    const ts = now();
    await this.db.execute(
      "UPDATE seller_orders SET service_provider_id=?,updated_at=? WHERE id=?",
      [carrier, ts, sellerOrderId],
    );
    await this.db.execute(
      "UPDATE order_items SET service_provider_id=?,shipping_notes=?,updated_at=? WHERE seller_order_id=?",
      [carrier, `carrier:${carrier}`, ts, sellerOrderId],
    );
    await this.db.execute(
      "UPDATE custom_request_items SET service_provider_id=?,shipping_notes=?,updated_at=? WHERE seller_order_id=?",
      [carrier, `carrier:${carrier}`, ts, sellerOrderId],
    );
    await this.db.execute(
      "UPDATE shipping_quotes SET service_provider_id=?,updated_at=? WHERE seller_order_id=? AND status IN ('requested','pending_buyer','rejected','expired')",
      [carrier, ts, sellerOrderId],
    );
    await this.audit(
      so.order_id,
      "seller_order",
      sellerOrderId,
      "updated",
      actor,
      so.status,
      so.status,
      { serviceProviderId: carrier, action: "assign_carrier" },
    );
    await this.recalculateAll(so.order_id, actor);
    return this.one("SELECT * FROM seller_orders WHERE id=?", [sellerOrderId]);
  }

  async buyerUpdateDeliveryAddress(
    orderId: string,
    deliveryAddress: Record<string, unknown>,
    actor: Actor,
  ) {
    const order = await this.requireBuyerOrder(orderId, actor);
    const address = String(deliveryAddress.address ?? "").trim();
    if (!address) throw new Error("Delivery address is required");
    const snapshot = {
      buyerUid: order.buyer_id,
      phone: String(deliveryAddress.phone ?? "").trim(),
      address,
      latitude:
        typeof deliveryAddress.latitude === "number"
          ? deliveryAddress.latitude
          : deliveryAddress.latitude
            ? Number(deliveryAddress.latitude)
            : null,
      longitude:
        typeof deliveryAddress.longitude === "number"
          ? deliveryAddress.longitude
          : deliveryAddress.longitude
            ? Number(deliveryAddress.longitude)
            : null,
      paymentMethod: String(deliveryAddress.paymentMethod ?? "cash_on_delivery"),
    };
    const ts = now();
    await this.db.execute(
      "UPDATE orders SET delivery_address_snapshot_json=?,updated_at=? WHERE id=?",
      [JSON.stringify(snapshot), ts, orderId],
    );
    await this.audit(
      orderId,
      "order",
      orderId,
      "updated",
      actor,
      order.calculated_status,
      order.calculated_status,
      { deliveryAddressUpdated: true, action: "buyer_address_applied" },
    );
    return this.one("SELECT * FROM orders WHERE id=?", [orderId]);
  }

  async stampSellerOrderFulfillmentSnapshot(
    sellerOrderId: string,
    snapshot: SellerFulfillmentSnapshot,
    actor: Actor,
  ) {
    const sellerOrder = await this.one(
      "SELECT order_id,status FROM seller_orders WHERE id=?",
      [sellerOrderId],
    );
    if (!sellerOrder) throw new Error("Seller order not found");
    const ts = now();
    await this.db.execute(
      "UPDATE seller_orders SET fulfillment_snapshot_json=?,updated_at=? WHERE id=?",
      [serializeSellerFulfillmentSnapshot(snapshot), ts, sellerOrderId],
    );
    await this.audit(
      String(sellerOrder.order_id),
      "seller_order",
      sellerOrderId,
      "updated",
      actor,
      sellerOrder.status,
      sellerOrder.status,
      { fulfillmentSnapshotUpdated: true },
    );
  }

  protected async isSellerOrderShippingLocked(sellerOrderId: string) {
    const acceptedQuote = await this.one(
      "SELECT id FROM shipping_quotes WHERE seller_order_id=? AND status='accepted' LIMIT 1",
      [sellerOrderId],
    );
    if (acceptedQuote) return true;
    const unifiedAccepted = await this.one(
      `SELECT dp.id FROM delivery_plans dp
       JOIN delivery_plan_stops dps ON dps.plan_id=dp.id
       WHERE dps.seller_order_id=? AND dp.status IN ('accepted','completed') LIMIT 1`,
      [sellerOrderId],
    );
    if (unifiedAccepted) return true;
    const lockedItem = await this.one(
      `SELECT id FROM order_items WHERE seller_order_id=? AND status IN (
        'assigned_to_shipment','received_by_carrier','rejected_by_carrier','in_transit',
        'at_distribution_center','out_for_delivery','delivered','delivery_rejected','delivery_failed'
      ) LIMIT 1`,
      [sellerOrderId],
    );
    return Boolean(lockedItem);
  }

  protected async applyMutableSellerShipping(
    sellerOrderId: string,
    shippingMinor: number,
    actor: Actor,
  ) {
    const item = await this.one(
      "SELECT * FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC,id ASC LIMIT 1",
      [sellerOrderId],
    );
    if (!item) return;
    await this.setOrderItemShipping(item, shippingMinor);
    await this.recalculateAll(String(item.order_id), actor);
  }

  protected async cancelPendingShippingQuotes(sellerOrderId: string, actor: Actor) {
    const ts = now();
    await this.db.execute(
      "UPDATE shipping_quotes SET status='cancelled',responded_at=?,updated_at=? WHERE seller_order_id=? AND status IN ('requested','pending_buyer','rejected','expired')",
      [ts, ts, sellerOrderId],
    );
    const orderId = (
      await this.one("SELECT order_id FROM seller_orders WHERE id=?", [
        sellerOrderId,
      ])
    )?.order_id;
    if (orderId) {
      await this.audit(
        String(orderId),
        "shipping_quote",
        sellerOrderId,
        "cancelled",
        actor,
        "pending",
        "cancelled",
        { reason: "fulfillment_reprice" },
      );
    }
  }

  async syncSellerFulfillmentToOpenOrders(
    sellerUid: string,
    snapshot: SellerFulfillmentSnapshot,
    actor: Actor,
  ) {
    const sellerOrders = await this.db.execute(
      `SELECT so.*, o.buyer_id, o.delivery_address_snapshot_json
       FROM seller_orders so
       JOIN orders o ON o.id=so.order_id
       WHERE so.seller_id=?
       AND o.calculated_status NOT IN ('fully_cancelled','closed','archived')
       AND so.status NOT IN ('cancelled','closed','fully_fulfilled')
       AND so.closed_at IS NULL`,
      [sellerUid],
    );
    const orderIds = new Set<string>();
    const buyerNotifyOrderIds: string[] = [];
    const buyerUidByOrder = new Map<string, string>();

    for (const sellerOrder of sellerOrders) {
      const sellerOrderId = String(sellerOrder.id);
      const orderId = String(sellerOrder.order_id);
      orderIds.add(orderId);
      buyerUidByOrder.set(orderId, String(sellerOrder.buyer_id ?? ""));

      await this.stampSellerOrderFulfillmentSnapshot(
        sellerOrderId,
        snapshot,
        actor,
      );
      if (await this.isSellerOrderShippingLocked(sellerOrderId)) continue;

      const items = await this.db.execute(
        "SELECT * FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')",
        [sellerOrderId],
      );
      const subtotalMinor = items.reduce(
        (total, item) =>
          total +
          Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
        0,
      );
      const shipping = calculateSellerShippingFromSnapshot(
        snapshot.shippingPricing,
        subtotalMinor,
        items.some((item) => Number(item.requires_special_vehicle) > 0),
      );

      const stop = await this.one(
        "SELECT id,plan_id FROM delivery_plan_stops WHERE seller_order_id=? AND status<>'cancelled' LIMIT 1",
        [sellerOrderId],
      );
      if (stop) {
        await this.db.execute(
          "UPDATE delivery_plan_stops SET requires_location_quote=?,fallback_shipping_price=?,fallback_special_vehicle_fee=?,updated_at=? WHERE id=?",
          [
            shipping.quoteRequired ? 1 : 0,
            shipping.confirmedShippingMinor,
            shipping.specialVehicleFeeMinor,
            now(),
            stop.id,
          ],
        );
      }

      await this.cancelPendingShippingQuotes(sellerOrderId, actor);

      let address = "";
      try {
        const raw = JSON.parse(
          String(sellerOrder.delivery_address_snapshot_json || "{}"),
        ) as { address?: string };
        address = String(raw.address ?? "").trim();
      } catch {
        address = "";
      }

      if (shipping.quoteRequired) {
        await this.applyMutableSellerShipping(sellerOrderId, 0, actor);
        if (address) {
          const existing = await this.one(
            "SELECT id FROM shipping_quotes WHERE seller_order_id=? LIMIT 1",
            [sellerOrderId],
          );
          if (!existing) {
            await this.requestShippingQuote(
              orderId,
              sellerOrderId,
              shipping.specialVehicleFeeMinor,
              { id: "system", role: "admin" },
            );
          }
        }
      } else {
        await this.applyMutableSellerShipping(
          sellerOrderId,
          shipping.confirmedShippingMinor,
          actor,
        );
      }
      buyerNotifyOrderIds.push(orderId);
    }

    return {
      orderIds: Array.from(orderIds),
      buyerNotifyOrderIds: Array.from(new Set(buyerNotifyOrderIds)),
      buyerUidByOrder,
    };
  }
}
