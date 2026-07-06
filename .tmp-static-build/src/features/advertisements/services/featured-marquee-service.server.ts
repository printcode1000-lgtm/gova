import "server-only";

import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import type {
  FeaturedMarqueeConfig,
  FeaturedMarqueePublished,
  FeaturedMarqueeRecord,
  SuperAdminIdentity,
} from "../entities/featured-marquee.entity";
import { featuredMarqueeRepository } from "../repositories/featured-marquee.repository";
import { featuredMarqueeConfigSchema } from "../validation/featured-marquee.schema";

function parseConfig(config: FeaturedMarqueeConfig): FeaturedMarqueeConfig {
  const result = featuredMarqueeConfigSchema.safeParse(config);
  if (!result.success) throw new Error("invalidFeaturedMarqueeConfig");
  return result.data;
}

function assertAdmin(identity: SuperAdminIdentity): void {
  if (!isSuperAdminIdentity(identity.uid, identity.phone)) {
    throw new Error("forbidden");
  }
}

export const featuredMarqueeService = {
  async getCurrent(): Promise<FeaturedMarqueePublished> {
    const record = await featuredMarqueeRepository.get();
    return {
      config: record.config,
      version: record.version,
      checkIntervalMinutes: record.checkIntervalMinutes,
      updatedAt: record.updatedAt,
    };
  },

  async getVersion() {
    const record = await featuredMarqueeRepository.get();
    return {
      version: record.version,
      checkIntervalMinutes: record.checkIntervalMinutes,
      updatedAt: record.updatedAt,
    };
  },

  async getAdmin(identity: SuperAdminIdentity): Promise<FeaturedMarqueeRecord> {
    assertAdmin(identity);
    return featuredMarqueeRepository.get();
  },

  async save(
    identity: SuperAdminIdentity,
    config: FeaturedMarqueeConfig,
    interval: number,
  ): Promise<FeaturedMarqueeRecord> {
    assertAdmin(identity);
    const parsed = parseConfig(config);
    return featuredMarqueeRepository.save(
      parsed,
      Math.max(5, Math.min(1440, interval)),
      identity.uid,
    );
  },
};
