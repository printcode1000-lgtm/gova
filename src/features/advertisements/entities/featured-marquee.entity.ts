export const FEATURED_MARQUEE_ID = "home-featured-marquee";
export const FEATURED_MARQUEE_CACHE_KEY = "advertisements:featured-marquee:v1";

/** قائمة معرفات المنتجات المختارة للعرض في الشريط */
export interface FeaturedMarqueeConfig {
  productIds: string[];
}

export interface FeaturedMarqueeRecord {
  id: typeof FEATURED_MARQUEE_ID;
  config: FeaturedMarqueeConfig;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface FeaturedMarqueePublished {
  config: FeaturedMarqueeConfig;
  version: number;
  updatedAt: string;
}

// Re-use SuperAdminIdentity from hero slider entity
export type { SuperAdminIdentity } from "./home-hero-slider.entity";
