import 'server-only';

import { ProfileShardedDatabaseClient } from './core/database/profile-sharded-db-client';
import type { DurableReleaseState, ReleaseStateStore } from '@asol/vercel-deploy-core';

let client: ProfileShardedDatabaseClient | null = null;

/** Control-owned durable release-state source backed by the system-ops shard. */
export const controlReleaseStateDataSource = {
  execute(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    client ??= new ProfileShardedDatabaseClient();
    return client.execute(sql, params);
  },
};


export interface SqlReleaseStateDataSource {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

export class SqlReleaseStateStore implements ReleaseStateStore {
  constructor(private readonly dataSource: SqlReleaseStateDataSource) {}

  private async ensureSchema(): Promise<void> {
    await this.dataSource.execute(
      `CREATE TABLE IF NOT EXISTS control_release_state (
        revision TEXT PRIMARY KEY NOT NULL,
        version INTEGER NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    );
  }

  async read(revision: string): Promise<DurableReleaseState | null> {
    await this.ensureSchema();
    const rows = rowsOf(await this.dataSource.execute(
      'SELECT state_json FROM control_release_state WHERE revision = ? LIMIT 1',
      [revision],
    ));
    const raw = rows[0]?.state_json;
    return typeof raw === 'string' ? (JSON.parse(raw) as DurableReleaseState) : null;
  }

  async write(
    state: DurableReleaseState,
    expectedVersion: number | null,
  ): Promise<DurableReleaseState> {
    await this.ensureSchema();
    const current = await this.read(state.revision);
    if ((current?.version ?? null) !== expectedVersion) {
      throw new Error('releaseStateVersionConflict');
    }
    await this.dataSource.execute(
      `INSERT INTO control_release_state (revision, version, state_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(revision) DO UPDATE SET
         version = excluded.version,
         state_json = excluded.state_json,
         updated_at = excluded.updated_at`,
      [state.revision, state.version, JSON.stringify(state), state.updatedAt],
    );
    return state;
  }
}

export const controlReleaseStateStore = new SqlReleaseStateStore(
  controlReleaseStateDataSource,
);
