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
        "SELECT DISTINCT o.* FROM orders o LEFT JOIN seller_orders so ON so.order_id=o.id LEFT JOIN delivery_plans dp ON dp.order_id=o.id LEFT JOIN delivery_plan_candidates dpc ON dpc.plan_id=dp.id WHERE so.seller_id=? OR so.service_provider_id=? OR dpc.provider_id=? ORDER BY o.created_at DESC LIMIT 100",
        [actor.id, actor.id, actor.id],
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
    return (
      await this.db.execute("SELECT * FROM orders WHERE id=? LIMIT 1", [
        orderId,
      ])
    )[0] as Row | undefined;
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
    const shippingQuotes = await this.db.execute(
      "SELECT * FROM shipping_quotes WHERE order_id=? ORDER BY seller_order_id ASC, version DESC",
      [orderId],
    );
    const deliveryPlans = await this.db.execute(
      "SELECT * FROM delivery_plans WHERE order_id=?",
      [orderId],
    );
    const deliveryPlanStops = await this.db.execute(
      "SELECT * FROM delivery_plan_stops WHERE order_id=? ORDER BY pickup_sequence ASC",
      [orderId],
    );
    const deliveryPlanCandidates = await this.db.execute(
      "SELECT dpc.* FROM delivery_plan_candidates dpc JOIN delivery_plans dp ON dp.id=dpc.plan_id WHERE dp.order_id=? ORDER BY dpc.coverage_score DESC,dpc.provider_id ASC",
      [orderId],
    );
    const deliveryPlanCandidateStops = await this.db.execute(
      "SELECT dpcs.* FROM delivery_plan_candidate_stops dpcs JOIN delivery_plans dp ON dp.id=dpcs.plan_id WHERE dp.order_id=?",
      [orderId],
    );
    const deliveryPlanQuotes = await this.db.execute(
      "SELECT * FROM delivery_plan_quotes WHERE order_id=? ORDER BY total_shipping_price ASC,created_at DESC",
      [orderId],
    );
    const deliveryPlanQuoteStops = await this.db.execute(
      "SELECT dpqs.* FROM delivery_plan_quote_stops dpqs JOIN delivery_plans dp ON dp.id=dpqs.plan_id WHERE dp.order_id=?",
      [orderId],
    );
    const deliveryPlanShipments = await this.db.execute(
      "SELECT dps.* FROM delivery_plan_shipments dps JOIN delivery_plans dp ON dp.id=dps.plan_id WHERE dp.order_id=?",
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
    const returnItems = await this.db.execute(
      "SELECT ri.* FROM return_request_items ri JOIN return_requests r ON r.id=ri.return_request_id WHERE r.order_id=? ORDER BY ri.created_at ASC",
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
      shippingQuotes,
      deliveryPlans,
      deliveryPlanStops,
      deliveryPlanCandidates,
      deliveryPlanCandidateStops,
      deliveryPlanQuotes,
      deliveryPlanQuoteStops,
      deliveryPlanShipments,
      cancellations,
      returns,
      returnItems,
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
        "SELECT 1 ok FROM seller_orders WHERE order_id=? AND (seller_id=? OR service_provider_id=?) UNION ALL SELECT 1 ok FROM delivery_plan_candidates dpc JOIN delivery_plans dp ON dp.id=dpc.plan_id WHERE dp.order_id=? AND dpc.provider_id=? LIMIT 1",
        [orderId, actor.id, actor.id, orderId, actor.id],
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
