import { usersDataSource } from '../../../core/data-source-registry';
import 'server-only';

import { eq } from 'drizzle-orm';

import type { IDatabaseClient } from '../../../core/database/database-client.interface';
import {
  featureFlags,
  type FeatureFlagEntity,
} from '../../../core/database/schema';

export interface FeatureFlagRecord {
  key: string;
  enabled: boolean;
  notes: string;
  updatedAt: string;
  updatedByUid?: string;
}

/** Single responsibility: persist and read the live feature-flag state. */
export class FeatureFlagRepository {
  constructor(private readonly database: IDatabaseClient = usersDataSource) {}

  async list(): Promise<FeatureFlagRecord[]> {
    const rows = await this.database.db.select().from(featureFlags);
    return rows.map(toRecord);
  }

  async set(input: {
    key: string;
    enabled: boolean;
    notes?: string;
    actorUid?: string;
  }): Promise<FeatureFlagRecord> {
    const row = {
      key: input.key,
      enabled: input.enabled,
      notes: input.notes ?? '',
      updatedAt: new Date().toISOString(),
      updatedByUid: input.actorUid ?? null,
    };

    const existing = await this.database.db
      .select({ key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.key, input.key))
      .limit(1);

    if (existing[0]) {
      await this.database.db
        .update(featureFlags)
        .set(row)
        .where(eq(featureFlags.key, input.key));
    } else {
      await this.database.db.insert(featureFlags).values(row);
    }
    return toRecord({ ...row });
  }
}

export const featureFlagRepository = new FeatureFlagRepository();

function toRecord(row: FeatureFlagEntity | (Omit<FeatureFlagEntity, 'updatedByUid'> & { updatedByUid: string | null })): FeatureFlagRecord {
  return {
    key: row.key,
    enabled: row.enabled,
    notes: row.notes,
    updatedAt: row.updatedAt,
    updatedByUid: row.updatedByUid ?? undefined,
  };
}
