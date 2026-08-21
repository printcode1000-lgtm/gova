export type {
  TrendingRibbonItem,
  TrendingRibbonConfig,
  TrendingRibbonRecord,
  TrendingRibbonPublished,
  SuperAdminIdentity,
} from "./domain/trending-ribbon.entity";
export {
  TRENDING_RIBBON_ID,
  TRENDING_RIBBON_CACHE_KEY,
  TRENDING_RIBBON_FALLBACK_LABEL,
  DEFAULT_TRENDING_RIBBON_CONFIG,
  DEFAULT_TRENDING_RIBBON_PUBLISHED,
  clampTrendingRibbonCheckInterval,
  isTrendingRibbonConfig,
  isTrendingRibbonPublished,
} from "./domain/trending-ribbon.entity";
export {
  trendingRibbonItemSchema,
  trendingRibbonConfigSchema,
  trendingRibbonSeedSchema,
} from "./domain/trending-ribbon.schema";
