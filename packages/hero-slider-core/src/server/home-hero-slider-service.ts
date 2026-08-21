import type {
  HomeHeroConfig,
  HomeHeroPublished,
  HomeHeroRecord,
  SuperAdminIdentity,
} from "../domain/hero-slider.entity";
import {
  clampHomeHeroCheckInterval,
  homeHeroImageKeys,
} from "../domain/hero-slider.entity";
import { homeHeroConfigSchema } from "../domain/hero-slider.schema";

export interface HomeHeroSliderRepositoryPort {
  get(): Promise<HomeHeroRecord>;
  save(
    config: HomeHeroConfig,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<HomeHeroRecord>;
}

export interface HomeHeroSliderImageStoragePort {
  resolveUrl(profileId: "home-hero-slider", imageKey: string): string;
  deleteByKey(profileId: "home-hero-slider", imageKey: string): Promise<void>;
}

export interface HomeHeroSliderAuthPort {
  isSuperAdminIdentity(uid: string, phone: string): boolean;
}

export interface HomeHeroSliderServicePorts {
  repository: HomeHeroSliderRepositoryPort;
  imageStorage: HomeHeroSliderImageStoragePort;
  auth: HomeHeroSliderAuthPort;
}

function parseConfig(config: HomeHeroConfig): HomeHeroConfig {
  const result = homeHeroConfigSchema.safeParse(config);
  if (!result.success) throw new Error("invalidHeroSliderConfig");
  return result.data;
}

function assertAdmin(auth: HomeHeroSliderAuthPort, identity: SuperAdminIdentity): void {
  if (!auth.isSuperAdminIdentity(identity.uid, identity.phone)) {
    throw new Error("forbidden");
  }
}

export function resolveHomeHeroImageUrls(
  config: HomeHeroConfig,
  imageStorage: HomeHeroSliderImageStoragePort,
): HomeHeroConfig {
  return {
    ...config,
    slides: config.slides.map((slide) => ({
      ...slide,
      image: slide.imageKey
        ? imageStorage.resolveUrl("home-hero-slider", slide.imageKey)
        : slide.image,
    })),
  };
}

function resolvedRecord(
  record: HomeHeroRecord,
  imageStorage: HomeHeroSliderImageStoragePort,
): HomeHeroRecord {
  return { ...record, config: resolveHomeHeroImageUrls(record.config, imageStorage) };
}

export function createHomeHeroSliderService(ports: HomeHeroSliderServicePorts) {
  return {
    async getCurrent(): Promise<HomeHeroPublished> {
      const record = await ports.repository.get();
      return {
        config: resolveHomeHeroImageUrls(record.config, ports.imageStorage),
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

    async getAdmin(identity: SuperAdminIdentity): Promise<HomeHeroRecord> {
      assertAdmin(ports.auth, identity);
      return resolvedRecord(await ports.repository.get(), ports.imageStorage);
    },

    async save(
      identity: SuperAdminIdentity,
      config: HomeHeroConfig,
      interval: number,
    ): Promise<HomeHeroRecord> {
      assertAdmin(ports.auth, identity);
      const current = await ports.repository.get();
      const parsed = parseConfig(config);
      const nextKeys = new Set(homeHeroImageKeys(parsed));
      const removedKeys = homeHeroImageKeys(current.config).filter((key) => !nextKeys.has(key));

      const saved = await ports.repository.save(
        parsed,
        clampHomeHeroCheckInterval(interval),
        identity.uid,
      );

      let storageWarning: HomeHeroRecord["storageWarning"];
      try {
        await Promise.all(
          removedKeys.map((imageKey) =>
            ports.imageStorage.deleteByKey("home-hero-slider", imageKey),
          ),
        );
      } catch {
        storageWarning = "imageDeleteFailed";
      }

      return {
        ...resolvedRecord(saved, ports.imageStorage),
        ...(storageWarning ? { storageWarning } : {}),
      };
    },
  };
}
