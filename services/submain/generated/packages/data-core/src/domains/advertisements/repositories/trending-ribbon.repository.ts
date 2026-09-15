import { advertisementsDataSource } from "../../../core";
import "server-only";

import type { IDatabaseClient } from "../../../core/database/database-client.interface";
import {
  DEFAULT_TRENDING_RIBBON_CONFIG,
  TRENDING_RIBBON_FALLBACK_LABEL,
  TRENDING_RIBBON_ID,
  type TrendingRibbonConfig,
  type TrendingRibbonRecord,
} from "@asol/trending-ribbon-core";

const LEGACY_TRANSLATION_LABEL = "home.trending.label";

function parseConfig(raw: string): TrendingRibbonConfig {
  const config = JSON.parse(raw) as TrendingRibbonConfig;
  return config.label === LEGACY_TRANSLATION_LABEL
    ? { ...config, label: TRENDING_RIBBON_FALLBACK_LABEL }
    : config;
}

export class TrendingRibbonRepository {
  constructor(private database: IDatabaseClient = advertisementsDataSource) {}

  async get(): Promise<TrendingRibbonRecord> {
    const row = await this.getRow();
    if (!row) {
      return {
        id: TRENDING_RIBBON_ID,
        config: DEFAULT_TRENDING_RIBBON_CONFIG,
        version: 0,
        checkIntervalMinutes: 15,
        updatedAt: "",
        updatedBy: null,
      };
    }

    return {
      id: TRENDING_RIBBON_ID,
      config: parseConfig(row.configJson),
      version: row.version,
      checkIntervalMinutes: row.checkIntervalMinutes,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async save(
    config: TrendingRibbonConfig,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<TrendingRibbonRecord> {
    const current = await this.get();
    const values = {
      configJson: JSON.stringify(config),
      version: current.version + 1,
      checkIntervalMinutes,
      updatedAt: new Date().toISOString(),
      updatedBy: actorUid,
    };
    await this.database.execute(
      `INSERT INTO trending_ribbon (id, config_json, version, check_interval_minutes, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json, version = excluded.version, check_interval_minutes = excluded.check_interval_minutes, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      [TRENDING_RIBBON_ID, values.configJson, values.version, values.checkIntervalMinutes, values.updatedAt, values.updatedBy],
    );
    return this.get();
  }

  private async getRow(): Promise<{ configJson: string; version: number; checkIntervalMinutes: number; updatedAt: string; updatedBy: string | null } | null> {
    const rows = await this.database.execute(
      `SELECT config_json AS configJson, version, check_interval_minutes AS checkIntervalMinutes, updated_at AS updatedAt, updated_by AS updatedBy FROM trending_ribbon WHERE id = ? LIMIT 1`,
      [TRENDING_RIBBON_ID],
    );
    return (rows[0] as any) ?? null;
  }
}

export const trendingRibbonRepository = new TrendingRibbonRepository();
