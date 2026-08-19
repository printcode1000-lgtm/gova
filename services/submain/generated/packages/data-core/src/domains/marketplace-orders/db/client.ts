import "server-only";
import { ShardedMarketplaceOrdersDb } from "./sharded-client";
import type { MarketplaceDb } from "../ports/marketplace-order-store";

export function createMarketplaceOrdersDb():MarketplaceDb {
  return new ShardedMarketplaceOrdersDb();
}
