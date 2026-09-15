import "server-only";
import { createMarketplaceOrdersDb } from "../db/client";
import type { MarketplaceDb } from "../ports/marketplace-order-store";

export const ORDER_TABLES_IN_DELETE_ORDER = [
  "dispute_messages", "disputes", "audit_trail",
  "cancellation_items", "return_request_items", "replacement_request_items",
  "cancellations", "return_requests", "replacement_requests",
  "refunds", "payments", "delivery_plan_quote_stops",
  "delivery_plan_shipments", "delivery_plan_candidate_stops",
  "delivery_plan_candidates", "delivery_plan_quotes", "delivery_plan_stops",
  "delivery_plans", "shipping_quotes", "shipment_items", "shipments",
  "custom_request_images", "custom_request_items", "order_items",
  "seller_orders", "orders",
] as const;

export async function deleteAllMarketplaceOrdersFromDb(db: MarketplaceDb): Promise<void> {
  for (const table of ORDER_TABLES_IN_DELETE_ORDER) {
    await db.execute(`DELETE FROM ${table}`);
  }
}

export async function deleteAllMarketplaceOrders(): Promise<void> {
  await deleteAllMarketplaceOrdersFromDb(createMarketplaceOrdersDb());
}
