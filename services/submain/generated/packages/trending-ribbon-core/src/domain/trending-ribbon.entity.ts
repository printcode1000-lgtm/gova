export const TRENDING_RIBBON_ID = "home-trending-ribbon";
export const TRENDING_RIBBON_CACHE_KEY = "advertisements:trending-ribbon:v1";
export const TRENDING_RIBBON_FALLBACK_LABEL = "home.trending.label";

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

export interface SuperAdminIdentity {
  uid: string;
  phone: string;
}

export const DEFAULT_TRENDING_RIBBON_CONFIG: TrendingRibbonConfig = {
  label: TRENDING_RIBBON_FALLBACK_LABEL,
  items: [],
};

export const DEFAULT_TRENDING_RIBBON_PUBLISHED: TrendingRibbonPublished = {
  config: DEFAULT_TRENDING_RIBBON_CONFIG,
  version: 0,
  checkIntervalMinutes: 15,
  updatedAt: "",
};

export function clampTrendingRibbonCheckInterval(value: number): number {
  return Math.max(5, Math.min(1440, value));
}

export function isTrendingRibbonConfig(value: unknown): value is TrendingRibbonConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<TrendingRibbonConfig>;
  return (
    typeof config.label === "string" &&
    Array.isArray(config.items) &&
    config.items.every(
      (item) =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Partial<TrendingRibbonItem>).label === "string" &&
        typeof (item as Partial<TrendingRibbonItem>).action === "string",
    )
  );
}

export function isTrendingRibbonPublished(value: unknown): value is TrendingRibbonPublished {
  if (!value || typeof value !== "object") return false;
  const published = value as Partial<TrendingRibbonPublished>;
  return (
    isTrendingRibbonConfig(published.config) &&
    typeof published.version === "number" &&
    typeof published.checkIntervalMinutes === "number" &&
    typeof published.updatedAt === "string"
  );
}
