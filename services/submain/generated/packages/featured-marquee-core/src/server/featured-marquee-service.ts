import type {
  FeaturedMarqueeConfig,
  FeaturedMarqueePublished,
  FeaturedMarqueeRecord,
  SuperAdminIdentity,
} from "../domain/featured-marquee.entity";
import { clampFeaturedMarqueeCheckInterval } from "../domain/featured-marquee.entity";
import { featuredMarqueeConfigSchema } from "../domain/featured-marquee.schema";

export interface FeaturedMarqueeRepositoryPort {
  get(): Promise<FeaturedMarqueeRecord>;
  save(
    config: FeaturedMarqueeConfig,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<FeaturedMarqueeRecord>;
}

export interface FeaturedMarqueeAuthPort {
  isSuperAdminIdentity(uid: string, phone: string): boolean;
}

export interface FeaturedMarqueeServicePorts {
  repository: FeaturedMarqueeRepositoryPort;
  auth: FeaturedMarqueeAuthPort;
}

function parseConfig(config: FeaturedMarqueeConfig): FeaturedMarqueeConfig {
  const result = featuredMarqueeConfigSchema.safeParse(config);
  if (!result.success) throw new Error("invalidFeaturedMarqueeConfig");
  return result.data;
}

function assertAdmin(auth: FeaturedMarqueeAuthPort, identity: SuperAdminIdentity): void {
  if (!auth.isSuperAdminIdentity(identity.uid, identity.phone)) {
    throw new Error("forbidden");
  }
}

export function createFeaturedMarqueeService(ports: FeaturedMarqueeServicePorts) {
  return {
    async getCurrent(): Promise<FeaturedMarqueePublished> {
      const record = await ports.repository.get();
      return {
        config: record.config,
        version: record.version,
        checkIntervalMinutes: record.checkIntervalMinutes,
        updatedAt: record.updatedAt,
      };
    },

    async getVersion() {
      const record = await ports.repository.get();
      return {
        version: record.version,
        checkIntervalMinutes: record.checkIntervalMinutes,
        updatedAt: record.updatedAt,
      };
    },

    async getAdmin(identity: SuperAdminIdentity): Promise<FeaturedMarqueeRecord> {
      assertAdmin(ports.auth, identity);
      return ports.repository.get();
    },

    async save(
      identity: SuperAdminIdentity,
      config: FeaturedMarqueeConfig,
      interval: number,
    ): Promise<FeaturedMarqueeRecord> {
      assertAdmin(ports.auth, identity);
      return ports.repository.save(
        parseConfig(config),
        clampFeaturedMarqueeCheckInterval(interval),
        identity.uid,
      );
    },
  };
}
