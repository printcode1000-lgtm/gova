import type { FeaturedMarqueeConfig } from "./featured-marquee.entity";
import { featuredMarqueeConfigSchema } from "./featured-marquee.schema";

/** Upgrades the legacy product ID array stored before the config object existed. */
export function normalizeFeaturedMarqueeConfig(
  raw: unknown,
): FeaturedMarqueeConfig {
  return featuredMarqueeConfigSchema.parse(
    Array.isArray(raw) ? { productIds: raw } : raw,
  );
}
