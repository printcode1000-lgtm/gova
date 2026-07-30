import "server-only";

import {
  MARKETPLACE_ORDER_TABLE_TO_DATABASE,
} from "@/core/database/database-shards";
import { ShardedRawDatabaseClient } from "@/core/database/sharded-raw-database-client";
import type { MarketplaceDb } from "./client";

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
