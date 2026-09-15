import { usersDataSource } from '../../../core';
import 'server-only';
import type { IDatabaseClient } from '../../../core/database/database-client.interface';

export interface FeatureFlagRecord {
  key: string;
  enabled: boolean;
  notes: string;
  updatedAt: string;
  updatedByUid?: string;
}

export class FeatureFlagRepository {
  constructor(private readonly database: IDatabaseClient = usersDataSource) {}
  async list(): Promise<FeatureFlagRecord[]> {
    const rows = await this.database.execute('SELECT key, enabled, notes, updated_at AS updatedAt, updated_by_uid AS updatedByUid FROM feature_flags');
    return rows.map(toRecord);
  }
  async set(input: { key: string; enabled: boolean; notes?: string; actorUid?: string }): Promise<FeatureFlagRecord> {
    const row = { key: input.key, enabled: input.enabled, notes: input.notes ?? '', updatedAt: new Date().toISOString(), updatedByUid: input.actorUid ?? null };
    await this.database.execute(
      `INSERT INTO feature_flags (key, enabled, notes, updated_at, updated_by_uid) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled, notes = excluded.notes, updated_at = excluded.updated_at, updated_by_uid = excluded.updated_by_uid`,
      [row.key, row.enabled ? 1 : 0, row.notes, row.updatedAt, row.updatedByUid],
    );
    return toRecord(row);
  }
}
export const featureFlagRepository = new FeatureFlagRepository();
function toRecord(row: any): FeatureFlagRecord {
  return { key: String(row.key), enabled: Boolean(row.enabled), notes: String(row.notes ?? ''), updatedAt: String(row.updatedAt ?? ''), updatedByUid: row.updatedByUid ?? undefined };
}
