export type {
  FeaturedMarqueeConfig,
  FeaturedMarqueeRecord,
  FeaturedMarqueePublished,
  SuperAdminIdentity,
} from "./domain/featured-marquee.entity";
export {
  FEATURED_MARQUEE_ID,
  FEATURED_MARQUEE_CACHE_KEY,
  FEATURED_MARQUEE_SECTION_TITLE,
  DEFAULT_FEATURED_MARQUEE_CONFIG,
  DEFAULT_FEATURED_MARQUEE_PUBLISHED,
  clampFeaturedMarqueeCheckInterval,
} from "./domain/featured-marquee.entity";
export {
  featuredMarqueeConfigSchema,
  featuredMarqueeSeedSchema,
} from "./domain/featured-marquee.schema";
export { normalizeFeaturedMarqueeConfig } from "./domain/featured-marquee-normalize";
