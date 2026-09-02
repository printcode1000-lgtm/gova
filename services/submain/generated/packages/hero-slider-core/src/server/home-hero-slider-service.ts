import type {
  HomeHeroConfig,
  HomeHeroPublished,
  HomeHeroRecord,
  SuperAdminIdentity,
} from "../domain/hero-slider.entity";
import {
  clampHomeHeroCheckInterval,
} from "../domain/hero-slider.entity";
import {
  collectRemovedHomeHeroImageKeys,
  prepareHomeHeroConfigForSave,
} from "../domain/home-hero-slider-persist";
import { homeHeroConfigSchema } from "../domain/hero-slider.schema";
import { normalizeHomeHeroConfig } from "../domain/home-hero-slider-normalize";

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
  existsByKey(profileId: "home-hero-slider", imageKey: string): Promise<boolean>;
}

export interface HomeHeroSliderAuthPort {
  isSuperAdminIdentity(uid: string, phone: string): boolean;
}

export interface HomeHeroSliderServicePorts {
  repository: HomeHeroSliderRepositoryPort;
  imageStorage: HomeHeroSliderImageStoragePort;
  auth: HomeHeroSliderAuthPort;
}

function parseConfig(config: unknown): HomeHeroConfig {
  const normalized = normalizeHomeHeroConfig(config);
  const result = homeHeroConfigSchema.safeParse(normalized);
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
  return {
    ...record,
    config: resolveHomeHeroImageUrls(
      normalizeHomeHeroConfig(record.config),
      imageStorage,
    ),
  };
}

async function deleteRemovedHomeHeroImages(
  imageStorage: HomeHeroSliderImageStoragePort,
  removedKeys: string[],
): Promise<HomeHeroRecord["storageWarning"]> {
  let storageWarning: HomeHeroRecord["storageWarning"];
  for (const imageKey of removedKeys) {
    try {
      const exists = await imageStorage.existsByKey("home-hero-slider", imageKey);
      if (!exists) continue;
      await imageStorage.deleteByKey("home-hero-slider", imageKey);
    } catch {
      storageWarning = "imageDeleteFailed";
    }
  }
  return storageWarning;
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
      const normalized = prepareHomeHeroConfigForSave(parsed);
      const removedKeys = collectRemovedHomeHeroImageKeys(
        current.config,
        normalized,
      );

      const saved = await ports.repository.save(
        normalized,
        clampHomeHeroCheckInterval(interval),
        identity.uid,
      );

      const storageWarning = await deleteRemovedHomeHeroImages(
        ports.imageStorage,
        removedKeys,
      );

      return {
        ...resolvedRecord(saved, ports.imageStorage),
        ...(storageWarning ? { storageWarning } : {}),
      };
    },
  };
}
