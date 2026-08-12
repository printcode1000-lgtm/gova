import "server-only";

import {
  MARKETPLACE_ORDER_TABLE_TO_DATABASE,
} from "@/modules/data-access/core/database/database-shards";
import { ShardedRawDatabaseClient } from "@/modules/data-access/core/database/sharded-raw-database-client";
import type { MarketplaceDb } from "@/modules/data-access/domains/marketplace-orders/ports/marketplace-order-store";

export class ShardedMarketplaceOrdersDb implements MarketplaceDb {
  private readonly client = new ShardedRawDatabaseClient(MARKETPLACE_ORDER_TABLE_TO_DATABASE);

  execute(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    return this.client.execute(sql, params);
  }

  async transaction<T>(work: (db: MarketplaceDb) => Promise<T>): Promise<T> {
    // Distributed writes cannot be rolled back atomically across Turso databases.
    // Service-level Saga/Outbox steps must make multi-shard mutations idempotent.
    return work(this);
  }
}
