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
  if (!isSuperAdminIdentity(identity.uid, identity.phone))
    throw new Error("forbidden");
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

async function cleanupDueImages(): Promise<void> {
  const queued = await homeHeroSliderRepository.dueImageCleanup();
  for (const image of queued) {
    try {
      await imageStorageOrchestrator.deleteByKey(
        image.storageProfileId,
        image.imageKey,
      );
      await homeHeroSliderRepository.markImageCleanup(image.id, "deleted");
    } catch {
      await homeHeroSliderRepository.markImageCleanup(image.id, "failed");
    }
  }
}

export const homeHeroSliderService = {
  async getPublished(): Promise<HomeHeroPublished> {
    const record = await homeHeroSliderRepository.get();
    return {
      config: resolveImageUrls(record.published),
      version: record.version,
      checkIntervalMinutes: record.checkIntervalMinutes,
      publishedAt: record.publishedAt,
    };
  },

  async getVersion() {
    const record = await homeHeroSliderRepository.get();
    return {
      version: record.version,
      checkIntervalMinutes: record.checkIntervalMinutes,
      publishedAt: record.publishedAt,
    };
  },

  async getAdmin(identity: SuperAdminIdentity): Promise<HomeHeroRecord> {
    assertAdmin(identity);
    const record = await homeHeroSliderRepository.get();
    return {
      ...record,
      draft: resolveImageUrls(record.draft),
      published: resolveImageUrls(record.published),
    };
  },

  async listPublications(identity: SuperAdminIdentity) {
    assertAdmin(identity);
    return homeHeroSliderRepository.listPublications();
  },

  async saveDraft(
    identity: SuperAdminIdentity,
    config: HomeHeroConfig,
    interval: number,
    expectedRevision: number,
  ) {
    assertAdmin(identity);
    return homeHeroSliderRepository.saveDraft(
      parseConfig(config),
      Math.max(5, Math.min(1440, interval)),
      identity.uid,
      expectedRevision,
    );
  },

  async publish(
    identity: SuperAdminIdentity,
    config: HomeHeroConfig,
    interval: number,
    expectedRevision: number,
  ) {
    assertAdmin(identity);
    const result = await homeHeroSliderRepository.publish(
      parseConfig(config),
      Math.max(5, Math.min(1440, interval)),
      identity.uid,
      expectedRevision,
    );
    await cleanupDueImages();
    return result;
  },

  async restore(
    identity: SuperAdminIdentity,
    publicationId: number,
    interval: number,
    expectedRevision: number,
  ) {
    assertAdmin(identity);
    const config =
      await homeHeroSliderRepository.getPublicationConfig(publicationId);
    if (!config) throw new Error("heroSliderPublicationNotFound");
    return this.publish(identity, config, interval, expectedRevision);
  },
};
