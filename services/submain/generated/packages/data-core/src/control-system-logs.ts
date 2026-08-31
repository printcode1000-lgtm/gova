import 'server-only';

import { ProfileShardedDatabaseClient } from './core/database/profile-sharded-db-client';

/**
 * Exact data adapter for the control-owned System Logs capability.
 *
 * System logs are stored in the profile shard, but control must never receive
 * the application-wide data-source registry or any unrelated database source.
 *
 * The client is created on first use, not on import: a door that opens a
 * database connection while it is being loaded turns every graph-walking test
 * and every build-time import into a runtime-configuration requirement.
 */
let client: ProfileShardedDatabaseClient | null = null;

export const controlSystemLogsDataSource = {
  execute(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    client ??= new ProfileShardedDatabaseClient();
    return client.execute(sql, params);
  },
};
