import "server-only";

import { eq } from "drizzle-orm";

import { advertisementsDbClient } from "@/core/database/advertisements-db-client";
import { trendingRibbon } from "@/core/database/advertisements/advertisements.schema";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import seedDocument from "@/features/advertisements/config/trending-ribbon.seed.json";
import {
  TRENDING_RIBBON_ID,
  type TrendingRibbonConfig,
  type TrendingRibbonRecord,
} from "../entities/trending-ribbon.entity";
import { trendingRibbonConfigSchema } from "../validation/trending-ribbon.schema";

function parseConfig(raw: string): TrendingRibbonConfig {
  return JSON.parse(raw) as TrendingRibbonConfig;
}

export class TrendingRibbonRepository {
  constructor(private database: IDatabaseClient = advertisementsDbClient) {}

  async get(): Promise<TrendingRibbonRecord> {
    let row = await this.getRow();
    if (!row) {
      await this.seed();
      row = await this.getRow();
    }
    if (!row) throw new Error("trendingRibbonNotFound");

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
    await this.database.db
      .update(trendingRibbon)
      .set({
        configJson: JSON.stringify(config),
        version: current.version + 1,
        checkIntervalMinutes,
        updatedAt: new Date().toISOString(),
        updatedBy: actorUid,
      })
      .where(eq(trendingRibbon.id, TRENDING_RIBBON_ID));
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

  private async seed(): Promise<void> {
    const config = trendingRibbonConfigSchema.parse(seedDocument);
    await this.database.db.insert(trendingRibbon).values({
      id: TRENDING_RIBBON_ID,
      configJson: JSON.stringify(config),
      version: 1,
      checkIntervalMinutes: 15,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const trendingRibbonRepository = new TrendingRibbonRepository();
