import type {
  SuperAdminIdentity,
  TrendingRibbonConfig,
  TrendingRibbonPublished,
  TrendingRibbonRecord,
} from "../domain/trending-ribbon.entity";
import { clampTrendingRibbonCheckInterval } from "../domain/trending-ribbon.entity";
import { trendingRibbonConfigSchema } from "../domain/trending-ribbon.schema";

export interface TrendingRibbonRepositoryPort {
  get(): Promise<TrendingRibbonRecord>;
  save(
    config: TrendingRibbonConfig,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<TrendingRibbonRecord>;
}

export interface TrendingRibbonAuthPort {
  isSuperAdminIdentity(uid: string, phone: string): boolean;
}

export interface TrendingRibbonServicePorts {
  repository: TrendingRibbonRepositoryPort;
  auth: TrendingRibbonAuthPort;
}

function assertAdmin(auth: TrendingRibbonAuthPort, identity: SuperAdminIdentity): void {
  if (!auth.isSuperAdminIdentity(identity.uid, identity.phone)) {
    throw new Error("forbidden");
  }
}

export function createTrendingRibbonService(ports: TrendingRibbonServicePorts) {
  return {
    async getCurrent(): Promise<TrendingRibbonPublished> {
      const record = await ports.repository.get();
      return {
        config: record.config,
        version: record.version,
        checkIntervalMinutes: record.checkIntervalMinutes,
        updatedAt: record.updatedAt,
      };
    },

    async getVersion(): Promise<Pick<TrendingRibbonPublished, "version" | "updatedAt" | "checkIntervalMinutes">> {
      const record = await ports.repository.get();
      return {
        version: record.version,
        updatedAt: record.updatedAt,
        checkIntervalMinutes: record.checkIntervalMinutes,
      };
    },

    async getAdmin(identity: SuperAdminIdentity): Promise<TrendingRibbonRecord> {
      assertAdmin(ports.auth, identity);
      return ports.repository.get();
    },

    async save(
      identity: SuperAdminIdentity,
      rawConfig: unknown,
      checkIntervalMinutes: number,
    ): Promise<TrendingRibbonRecord> {
      assertAdmin(ports.auth, identity);
      const config = trendingRibbonConfigSchema.parse(rawConfig) as TrendingRibbonConfig;
      return ports.repository.save(
        config,
        clampTrendingRibbonCheckInterval(checkIntervalMinutes),
        identity.uid,
      );
    },
  };
}
