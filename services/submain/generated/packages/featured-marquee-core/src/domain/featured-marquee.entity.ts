export const FEATURED_MARQUEE_ID = "home-featured-marquee";
export const FEATURED_MARQUEE_CACHE_KEY = "advertisements:featured-marquee:v2";
export const FEATURED_MARQUEE_SECTION_TITLE = "home.featured.title";

export interface FeaturedMarqueeConfig {
  productIds: string[];
}

export interface FeaturedMarqueeRecord {
  id: typeof FEATURED_MARQUEE_ID;
  config: FeaturedMarqueeConfig;
  version: number;
  checkIntervalMinutes: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface FeaturedMarqueePublished {
  config: FeaturedMarqueeConfig;
  version: number;
  checkIntervalMinutes: number;
  updatedAt: string;
}

export interface SuperAdminIdentity {
  uid: string;
  phone: string;
}

export const DEFAULT_FEATURED_MARQUEE_CONFIG: FeaturedMarqueeConfig = {
  productIds: [],
};

export const DEFAULT_FEATURED_MARQUEE_PUBLISHED: FeaturedMarqueePublished = {
  config: DEFAULT_FEATURED_MARQUEE_CONFIG,
  version: 0,
  checkIntervalMinutes: 15,
  updatedAt: "",
};

export function clampFeaturedMarqueeCheckInterval(value: number): number {
  return Math.max(5, Math.min(1440, value));
}
