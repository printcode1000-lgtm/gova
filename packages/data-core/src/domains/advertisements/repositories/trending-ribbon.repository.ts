import { advertisementsDataSource } from "../../../core";
import "server-only";

import { eq } from "drizzle-orm";

import { trendingRibbon } from "../../../core/database/advertisements/advertisements.schema";
import type { IDatabaseClient } from "../../../core/database/database-client.interface";
import {
  DEFAULT_TRENDING_RIBBON_CONFIG,
  TRENDING_RIBBON_ID,
  type TrendingRibbonConfig,
  type TrendingRibbonRecord,
} from "@asol/trending-ribbon-core";

function parseConfig(raw: string): TrendingRibbonConfig {
  return JSON.parse(raw) as TrendingRibbonConfig;
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
    if (await this.getRow()) {
      await this.database.db
        .update(trendingRibbon)
        .set(values)
        .where(eq(trendingRibbon.id, TRENDING_RIBBON_ID));
    } else {
      await this.database.db.insert(trendingRibbon).values({
        id: TRENDING_RIBBON_ID,
        ...values,
      });
    }
    return this.get();
  }

  private async getRow() {
    const rows = await this.database.db
      .select()
      .from(trendingRibbon)
      .where(eq(trendingRibbon.id, TRENDING_RIBBON_ID))
      .limit(1);
    return rows[0] ?? null;
  }
}

export const trendingRibbonRepository = new TrendingRibbonRepository();
