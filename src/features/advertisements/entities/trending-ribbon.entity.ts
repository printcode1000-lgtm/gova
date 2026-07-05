export const TRENDING_RIBBON_ID = "home-trending-ribbon";
export const TRENDING_RIBBON_CACHE_KEY = "advertisements:trending-ribbon:v1";

export interface TrendingRibbonItem {
  label: string;
  action: string;
}

export interface TrendingRibbonConfig {
  label: string;
  items: TrendingRibbonItem[];
}

export interface TrendingRibbonRecord {
  id: typeof TRENDING_RIBBON_ID;
  config: TrendingRibbonConfig;
  version: number;
  checkIntervalMinutes: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface TrendingRibbonPublished {
  config: TrendingRibbonConfig;
  version: number;
  checkIntervalMinutes: number;
  updatedAt: string;
}

export type { SuperAdminIdentity } from "./home-hero-slider.entity";
