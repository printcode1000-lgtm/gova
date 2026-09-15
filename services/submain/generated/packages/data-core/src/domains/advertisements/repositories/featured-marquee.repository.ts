import { advertisementsDataSource } from "../../../core";
import "server-only";

import type { IDatabaseClient } from "../../../core/database/database-client.interface";
import {
  DEFAULT_FEATURED_MARQUEE_CONFIG,
  FEATURED_MARQUEE_ID,
  normalizeFeaturedMarqueeConfig,
  type FeaturedMarqueeConfig,
  type FeaturedMarqueeRecord,
} from "@asol/featured-marquee-core";

function parseConfig(value: string): FeaturedMarqueeConfig {
  return normalizeFeaturedMarqueeConfig(JSON.parse(value));
}

export class FeaturedMarqueeRepository {
  constructor(private database: IDatabaseClient = advertisementsDataSource) {}

  async get(): Promise<FeaturedMarqueeRecord> {
    const row = await this.getRow();
    if (!row) {
      return {
        id: FEATURED_MARQUEE_ID,
        config: DEFAULT_FEATURED_MARQUEE_CONFIG,
        version: 0,
        checkIntervalMinutes: 15,
        updatedAt: "",
        updatedBy: null,
      };
    }

    return {
      id: FEATURED_MARQUEE_ID,
      config: parseConfig(row.productIdsJson),
      version: row.version,
      checkIntervalMinutes: row.checkIntervalMinutes,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async save(
    config: FeaturedMarqueeConfig,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<FeaturedMarqueeRecord> {
    const current = await this.get();
    const values = {
      productIdsJson: JSON.stringify(config),
      version: current.version + 1,
      checkIntervalMinutes,
      updatedAt: new Date().toISOString(),
      updatedBy: actorUid,
    };
    await this.database.execute(
      `INSERT INTO featured_marquee (id, product_ids_json, version, check_interval_minutes, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET product_ids_json = excluded.product_ids_json, version = excluded.version, check_interval_minutes = excluded.check_interval_minutes, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      [FEATURED_MARQUEE_ID, values.productIdsJson, values.version, values.checkIntervalMinutes, values.updatedAt, values.updatedBy],
    );
    return this.get();
  }

  private async getRow(): Promise<{ productIdsJson: string; version: number; checkIntervalMinutes: number; updatedAt: string; updatedBy: string | null } | null> {
    const rows = await this.database.execute(
      `SELECT product_ids_json AS productIdsJson, version, check_interval_minutes AS checkIntervalMinutes, updated_at AS updatedAt, updated_by AS updatedBy FROM featured_marquee WHERE id = ? LIMIT 1`,
      [FEATURED_MARQUEE_ID],
    );
    return (rows[0] as any) ?? null;
  }
}

export const featuredMarqueeRepository = new FeaturedMarqueeRepository();
