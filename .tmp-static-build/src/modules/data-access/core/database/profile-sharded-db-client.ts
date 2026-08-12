import "server-only";

import type { IDatabaseClient } from "@/modules/data-access/core/database/database-client.interface";
import { PROFILE_SHARD_TABLE_TO_DATABASE } from "@/modules/data-access/core/database/database-shards";
import { ShardedRawDatabaseClient } from "@/modules/data-access/core/database/sharded-raw-database-client";

export class ProfileShardedDatabaseClient implements IDatabaseClient {
  private readonly client = new ShardedRawDatabaseClient(PROFILE_SHARD_TABLE_TO_DATABASE);

  get db(): any {
    throw new Error("Drizzle db is not available for sharded profile databases.");
  }

  execute(sql: string, params?: any[]): Promise<any[]> {
    return this.client.execute(sql, params);
  }

  insert(table: string, data: Record<string, any>): Promise<any> {
    return this.client.insert(table, data);
  }

  select(table: string, where: Record<string, any>, limit?: number): Promise<any[]> {
    return this.client.select(table, where, limit);
  }

  update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any> {
    return this.client.update(table, data, where);
  }

  delete(table: string, where: Record<string, any>): Promise<any> {
    return this.client.delete(table, where);
  }
}
