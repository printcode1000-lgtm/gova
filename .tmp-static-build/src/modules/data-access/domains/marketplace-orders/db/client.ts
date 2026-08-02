import "server-only";
import { ShardedMarketplaceOrdersDb } from "@/modules/data-access/domains/marketplace-orders/db/sharded-client";
import type { MarketplaceDb } from "@/modules/data-access/domains/marketplace-orders/ports/marketplace-order-store";

export function createMarketplaceOrdersDb():MarketplaceDb {
  return new ShardedMarketplaceOrdersDb();
}
