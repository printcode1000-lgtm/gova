import "server-only";

import type { TrendingRibbonConfig, TrendingRibbonPublished, TrendingRibbonRecord } from "../entities/trending-ribbon.entity";
import { trendingRibbonRepository } from "../repositories/trending-ribbon.repository";
import { trendingRibbonConfigSchema } from "../validation/trending-ribbon.schema";

export const featuredTrendingRibbonService = {
  async getCurrent(): Promise<TrendingRibbonPublished> {
    const record = await trendingRibbonRepository.get();
    return {
      config: record.config,
      version: record.version,
      checkIntervalMinutes: record.checkIntervalMinutes,
      updatedAt: record.updatedAt,
    };
  },

  async getVersion(): Promise<Pick<TrendingRibbonPublished, "version" | "updatedAt" | "checkIntervalMinutes">> {
    const record = await trendingRibbonRepository.get();
    return {
      version: record.version,
      updatedAt: record.updatedAt,
      checkIntervalMinutes: record.checkIntervalMinutes,
    };
  },

  async save(
    rawConfig: unknown,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<TrendingRibbonRecord> {
    const config = trendingRibbonConfigSchema.parse(rawConfig) as TrendingRibbonConfig;
    return trendingRibbonRepository.save(config, checkIntervalMinutes, actorUid);
  },
};
