import 'server-only';

import { ProfileShardedDatabaseClient } from './core/database/profile-sharded-db-client';

let client: ProfileShardedDatabaseClient | null = null;

/** Control-owned durable release-state source backed by the system-ops shard. */
export const controlReleaseStateDataSource = {
  execute(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    client ??= new ProfileShardedDatabaseClient();
    return client.execute(sql, params);
  },
};
