export const PROFILE_SHARDS = {
  "profile-core": [
    "user_profiles",
    "user_specialties",
  ],
  "profile-contact": [
    "profile_contact_points",
    "profile_locations",
    "profile_working_hours",
  ],
  "profile-media": [
    "profile_images",
  ],
  "profile-social": [
    "follows",
    "profile_reviews",
    "profile_review_helpful",
    "profile_review_replies",
  ],
  "profile-catalog": [
    "profile_featured_products",
    "profile_trending_items",
    "profile_search_categories",
    "profile_category_product_counts",
  ],
  "profile-promotions": [
    "seller_discounts",
    "seller_discount_usages",
  ],
  "profile-fulfillment": [
    "profile_delivery_carriers",
  ],
  "system-ops": [
    "system_logs",
    "control_release_state",
    "data_health_runs",
    "data_health_findings",
    "data_health_cleanup_plans",
    "data_health_cleanup_audit",
    "data_health_quarantine",
    "data_health_locks",
    "data_health_order_purge_plans",
    "data_health_storage_deletion_tasks",
  ],
} as const;

export const MARKETPLACE_ORDER_SHARDS = {
  "orders-core": [
    "orders",
    "seller_orders",
  ],
  "orders-items": [
    "order_items",
    "custom_request_items",
    "custom_request_images",
  ],
  "orders-fulfillment": [
    "shipments",
    "shipment_items",
  ],
  "orders-delivery-plans": [
    "delivery_plans",
    "delivery_plan_stops",
    "delivery_plan_candidates",
    "delivery_plan_candidate_stops",
    "delivery_plan_quotes",
    "delivery_plan_quote_stops",
    "delivery_plan_shipments",
  ],
  "orders-shipping-quotes": [
    "shipping_quotes",
  ],
  "orders-payments": [
    "payments",
  ],
  "orders-refunds": [
    "refunds",
  ],
  "orders-after-sales": [
    "cancellations",
    "cancellation_items",
    "return_requests",
    "return_request_items",
    "replacement_requests",
    "replacement_request_items",
  ],
  "orders-disputes-audit": [
    "disputes",
    "dispute_messages",
    "audit_trail",
  ],
} as const;

export const DATABASE_SHARDS = {
  ...PROFILE_SHARDS,
  ...MARKETPLACE_ORDER_SHARDS,
} as const;

export type ProfileShardName = keyof typeof PROFILE_SHARDS;
export type MarketplaceOrderShardName = keyof typeof MARKETPLACE_ORDER_SHARDS;
export type DatabaseShardName = keyof typeof DATABASE_SHARDS;

export type ProfileShardTable = (typeof PROFILE_SHARDS)[ProfileShardName][number];
export type MarketplaceOrderShardTable =
  (typeof MARKETPLACE_ORDER_SHARDS)[MarketplaceOrderShardName][number];
export type DatabaseShardTable = ProfileShardTable | MarketplaceOrderShardTable;

export const PROFILE_SHARD_TABLE_TO_DATABASE = Object.fromEntries(
  Object.entries(PROFILE_SHARDS).flatMap(([databaseName, tables]) =>
    tables.map((table) => [table, databaseName]),
  ),
) as Record<ProfileShardTable, ProfileShardName>;

export const MARKETPLACE_ORDER_TABLE_TO_DATABASE = Object.fromEntries(
  Object.entries(MARKETPLACE_ORDER_SHARDS).flatMap(([databaseName, tables]) =>
    tables.map((table) => [table, databaseName]),
  ),
) as Record<MarketplaceOrderShardTable, MarketplaceOrderShardName>;

export const DATABASE_SHARD_TABLE_TO_DATABASE = {
  ...PROFILE_SHARD_TABLE_TO_DATABASE,
  ...MARKETPLACE_ORDER_TABLE_TO_DATABASE,
} as Record<DatabaseShardTable, DatabaseShardName>;

export const PROFILE_SHARD_DATABASE_NAMES = Object.keys(PROFILE_SHARDS) as ProfileShardName[];
export const MARKETPLACE_ORDER_SHARD_DATABASE_NAMES = Object.keys(
  MARKETPLACE_ORDER_SHARDS,
) as MarketplaceOrderShardName[];
export const DATABASE_SHARD_NAMES = Object.keys(DATABASE_SHARDS) as DatabaseShardName[];

export { sqliteFileNameForShard } from "@asol/dev-core";

export function envPrefixForShard(databaseName: DatabaseShardName): string {
  return databaseName.toUpperCase().replace(/-/g, "_");
}
