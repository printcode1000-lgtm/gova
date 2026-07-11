import "server-only";

import type { MarketplaceDb } from "../db/client";

type Row = Record<string, unknown>;

export class OrderQueryRepository {
  constructor(private db: MarketplaceDb) {}

  async listForActor(actor: { id: string; role: string }) {
    if (actor.role === "admin") {
      return this.db.execute(
        "SELECT * FROM orders ORDER BY created_at DESC LIMIT 100",
      );
    }
    if (actor.role === "buyer") {
      return this.db.execute(
        "SELECT * FROM orders WHERE buyer_id=? ORDER BY created_at DESC LIMIT 100",
        [actor.id],
      );
    }
    if (actor.role === "seller" || actor.role === "service_provider") {
      return this.db.execute(
        "SELECT DISTINCT o.* FROM orders o JOIN seller_orders so ON so.order_id=o.id WHERE so.seller_id=? OR so.service_provider_id=? ORDER BY o.created_at DESC LIMIT 100",
        [actor.id, actor.id],
      );
    }
    if (actor.role === "carrier") {
      return this.db.execute(
        "SELECT DISTINCT o.* FROM orders o JOIN shipments s ON s.order_id=o.id WHERE s.carrier_id=? ORDER BY o.created_at DESC LIMIT 100",
        [actor.id],
      );
    }
    return [];
  }

  async getOrder(orderId: string) {
    return (await this.db.execute("SELECT * FROM orders WHERE id=? LIMIT 1", [
      orderId,
    ]))[0] as Row | undefined;
  }

  async getDetails(orderId: string) {
    const order = await this.getOrder(orderId);
    if (!order) return null;
    const sellerOrders = await this.db.execute(
      "SELECT * FROM seller_orders WHERE order_id=? ORDER BY created_at ASC",
      [orderId],
    );
    const orderItems = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? ORDER BY created_at ASC",
      [orderId],
    );
    const customItems = await this.db.execute(
      "SELECT * FROM custom_request_items WHERE order_id=? ORDER BY created_at ASC",
      [orderId],
    );
    const shipments = await this.db.execute(
      "SELECT * FROM shipments WHERE order_id=? ORDER BY created_at ASC",
      [orderId],
    );
    const shipmentItems = await this.db.execute(
      "SELECT * FROM shipment_items WHERE order_id=? ORDER BY created_at ASC",
      [orderId],
    );
    const cancellations = await this.db.execute(
      "SELECT * FROM cancellations WHERE order_id=? ORDER BY created_at DESC",
      [orderId],
    );
    const returns = await this.db.execute(
      "SELECT * FROM return_requests WHERE order_id=? ORDER BY created_at DESC",
      [orderId],
    );
    const replacements = await this.db.execute(
      "SELECT * FROM replacement_requests WHERE order_id=? ORDER BY created_at DESC",
      [orderId],
    );
    const disputes = await this.db.execute(
      "SELECT * FROM disputes WHERE order_id=? ORDER BY created_at DESC",
      [orderId],
    );
    const audit = await this.db.execute(
      "SELECT * FROM audit_trail WHERE order_id=? ORDER BY created_at DESC LIMIT 50",
      [orderId],
    );

    return {
      order,
      sellerOrders,
      orderItems,
      customItems,
      shipments,
      shipmentItems,
      cancellations,
      returns,
      replacements,
      disputes,
      audit,
    };
  }

  async canAccess(orderId: string, actor: { id: string; role: string }) {
    if (actor.role === "admin") return true;
    const order = await this.getOrder(orderId);
    if (!order) return false;
    if (actor.role === "buyer") return order.buyer_id === actor.id;
    if (actor.role === "seller" || actor.role === "service_provider") {
      const rows = await this.db.execute(
        "SELECT 1 ok FROM seller_orders WHERE order_id=? AND (seller_id=? OR service_provider_id=?) LIMIT 1",
        [orderId, actor.id, actor.id],
      );
      return rows.length > 0;
    }
    if (actor.role === "carrier") {
      const rows = await this.db.execute(
        "SELECT 1 ok FROM shipments WHERE order_id=? AND carrier_id=? LIMIT 1",
        [orderId, actor.id],
      );
      return rows.length > 0;
    }
    return false;
  }
}
