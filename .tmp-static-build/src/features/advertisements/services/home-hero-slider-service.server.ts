import "server-only";

import { imageStorageOrchestrator } from "@/core/storage/storage/image-storage-orchestrator.server";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import type {
  HomeHeroConfig,
  HomeHeroPublished,
  HomeHeroRecord,
  SuperAdminIdentity,
} from "../entities/home-hero-slider.entity";
import { homeHeroSliderRepository } from "../repositories/home-hero-slider.repository";
import { homeHeroConfigSchema } from "../validation/home-hero-slider.schema";

function parseConfig(config: HomeHeroConfig): HomeHeroConfig {
  const result = homeHeroConfigSchema.safeParse(config);
  if (!result.success) throw new Error("invalidHeroSliderConfig");
  return result.data;
}

function assertAdmin(identity: SuperAdminIdentity): void {
  if (!isSuperAdminIdentity(identity.uid, identity.phone)) {
    throw new Error("forbidden");
  }
}

function resolveImageUrls(config: HomeHeroConfig): HomeHeroConfig {
  return {
    ...config,
    slides: config.slides.map((slide) => ({
      ...slide,
      image: slide.imageKey
        ? imageStorageOrchestrator.resolveUrl(
            "home-hero-slider",
            slide.imageKey,
          )
        : slide.image,
    })),
  };
}

function resolvedRecord(record: HomeHeroRecord): HomeHeroRecord {
  return { ...record, config: resolveImageUrls(record.config) };
}

export const homeHeroSliderService = {
  async getCurrent(): Promise<HomeHeroPublished> {
    const record = await homeHeroSliderRepository.get();
    return {
      config: resolveImageUrls(record.config),
      version: record.version,
      checkIntervalMinutes: record.checkIntervalMinutes,
      updatedAt: record.updatedAt,
    };
  },

  async getVersion() {
    const record = await homeHeroSliderRepository.get();
    return {
      version: record.version,
      checkIntervalMinutes: record.checkIntervalMinutes,
      updatedAt: record.updatedAt,
    };
  },

  async getAdmin(identity: SuperAdminIdentity): Promise<HomeHeroRecord> {
    assertAdmin(identity);
    return resolvedRecord(await homeHeroSliderRepository.get());
  },

  async save(
    identity: SuperAdminIdentity,
    config: HomeHeroConfig,
    interval: number,
  ): Promise<HomeHeroRecord> {
    assertAdmin(identity);
    const current = await homeHeroSliderRepository.get();
    const parsed = parseConfig(config);
    const nextKeys = new Set(
      parsed.slides
        .map((slide) => slide.imageKey)
        .filter((key): key is string => Boolean(key)),
    );
    const removedKeys = current.config.slides
      .map((slide) => slide.imageKey)
      .filter((key): key is string => Boolean(key))
      .filter((key) => !nextKeys.has(key));

    // Database first: a failed save never deletes an image that is still live.
    const saved = await homeHeroSliderRepository.save(
      parsed,
      Math.max(5, Math.min(1440, interval)),
      identity.uid,
    );

    // Storage second: after the single current record no longer references it.
    let storageWarning: HomeHeroRecord["storageWarning"];
    try {
      await Promise.all(
        removedKeys.map((imageKey) =>
          imageStorageOrchestrator.deleteByKey("home-hero-slider", imageKey),
        ),
      );
    } catch {
      storageWarning = "imageDeleteFailed";
    }

    return {
      ...resolvedRecord(saved),
      ...(storageWarning ? { storageWarning } : {}),
    };
  },
};
