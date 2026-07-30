import "server-only";

import type { MarketplaceDb } from "../db/client";

type Row = Record<string, unknown>;

function placeholders(values: unknown[]): string {
  return values.map(() => "?").join(",");
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value)).filter(Boolean))];
}

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
      const sellerOrders = await this.db.execute(
        "SELECT order_id FROM seller_orders WHERE seller_id=? OR service_provider_id=?",
        [actor.id, actor.id],
      );
      const candidates = await this.db.execute(
        "SELECT plan_id FROM delivery_plan_candidates WHERE provider_id=?",
        [actor.id],
      );
      let planOrders: Row[] = [];
      const planIds = uniqueStrings(candidates.map((row) => row.plan_id));
      if (planIds.length > 0) {
        planOrders = await this.db.execute(
          `SELECT order_id FROM delivery_plans WHERE id IN (${placeholders(planIds)})`,
          planIds,
        );
      }
      const orderIds = uniqueStrings([
        ...sellerOrders.map((row) => row.order_id),
        ...planOrders.map((row) => row.order_id),
      ]);
      if (orderIds.length === 0) return [];
      return this.db.execute(
        `SELECT * FROM orders WHERE id IN (${placeholders(orderIds)}) ORDER BY created_at DESC LIMIT 100`,
        orderIds,
      );
    }
    if (actor.role === "carrier") {
      const shipments = await this.db.execute(
        "SELECT DISTINCT order_id FROM shipments WHERE carrier_id=?",
        [actor.id],
      );
      const orderIds = uniqueStrings(shipments.map((row) => row.order_id));
      if (orderIds.length === 0) return [];
      return this.db.execute(
        `SELECT * FROM orders WHERE id IN (${placeholders(orderIds)}) ORDER BY created_at DESC LIMIT 100`,
        orderIds,
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
      deliveryPlans.length > 0
        ? `SELECT * FROM delivery_plan_candidates WHERE plan_id IN (${placeholders(
            deliveryPlans.map((plan) => plan.id),
          )}) ORDER BY coverage_score DESC,provider_id ASC`
        : "SELECT * FROM delivery_plan_candidates WHERE 1=0",
      deliveryPlans.map((plan) => plan.id),
    );
    const deliveryPlanCandidateStops = await this.db.execute(
      deliveryPlans.length > 0
        ? `SELECT * FROM delivery_plan_candidate_stops WHERE plan_id IN (${placeholders(
            deliveryPlans.map((plan) => plan.id),
          )})`
        : "SELECT * FROM delivery_plan_candidate_stops WHERE 1=0",
      deliveryPlans.map((plan) => plan.id),
    );
    const deliveryPlanQuotes = await this.db.execute(
      "SELECT * FROM delivery_plan_quotes WHERE order_id=? ORDER BY total_shipping_price ASC,created_at DESC",
      [orderId],
    );
    const deliveryPlanQuoteStops = await this.db.execute(
      deliveryPlans.length > 0
        ? `SELECT * FROM delivery_plan_quote_stops WHERE plan_id IN (${placeholders(
            deliveryPlans.map((plan) => plan.id),
          )})`
        : "SELECT * FROM delivery_plan_quote_stops WHERE 1=0",
      deliveryPlans.map((plan) => plan.id),
    );
    const deliveryPlanShipments = await this.db.execute(
      deliveryPlans.length > 0
        ? `SELECT * FROM delivery_plan_shipments WHERE plan_id IN (${placeholders(
            deliveryPlans.map((plan) => plan.id),
          )})`
        : "SELECT * FROM delivery_plan_shipments WHERE 1=0",
      deliveryPlans.map((plan) => plan.id),
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
      returns.length > 0
        ? `SELECT * FROM return_request_items WHERE return_request_id IN (${placeholders(
            returns.map((row) => row.id),
          )}) ORDER BY created_at ASC`
        : "SELECT * FROM return_request_items WHERE 1=0",
      returns.map((row) => row.id),
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
      const sellerRows = await this.db.execute(
        "SELECT 1 ok FROM seller_orders WHERE order_id=? AND (seller_id=? OR service_provider_id=?) LIMIT 1",
        [orderId, actor.id, actor.id],
      );
      if (sellerRows.length > 0) return true;
      const plans = await this.db.execute("SELECT id FROM delivery_plans WHERE order_id=?", [
        orderId,
      ]);
      if (plans.length === 0) return false;
      const planIds = plans.map((plan) => plan.id);
      const candidateRows = await this.db.execute(
        `SELECT 1 ok FROM delivery_plan_candidates WHERE plan_id IN (${placeholders(
          planIds,
        )}) AND provider_id=? LIMIT 1`,
        [...planIds, actor.id],
      );
      return candidateRows.length > 0;
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
