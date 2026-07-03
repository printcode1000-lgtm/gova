import "server-only";

import { and, asc, desc, eq, lte } from "drizzle-orm";

import seedDocument from "@/features/advertisements/config/home-hero-slider.seed.json";
import { advertisementsDbClient } from "@/core/database/advertisements-db-client";
import {
  advertisementImageCleanup,
  heroSliderPublications,
  heroSliderSlides,
  heroSliders,
} from "@/core/database/advertisements/advertisements.schema";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import {
  HOME_HERO_SLIDER_ID,
  type HomeHeroConfig,
  type HomeHeroPublication,
  type HomeHeroRecord,
  type HomeHeroSlide,
} from "../entities/home-hero-slider.entity";
import { homeHeroSeedSchema } from "../validation/home-hero-slider.schema";

type SliderStage = "draft" | "published";

function parseConfig(value: string): HomeHeroConfig {
  return JSON.parse(value) as HomeHeroConfig;
}

function slideRows(config: HomeHeroConfig, stage: SliderStage) {
  return config.slides.map((slide, index) => ({
    sliderId: HOME_HERO_SLIDER_ID,
    stage,
    slideId: `slide-${String(index + 1).padStart(3, "0")}`,
    priority: slide.priority,
    imageKey: slide.imageKey || null,
    imageUrl: slide.image,
    title: slide.title,
    subtitle: slide.subtitle,
    duration: slide.duration,
    action: slide.action,
  }));
}

function rowToSlide(row: typeof heroSliderSlides.$inferSelect): HomeHeroSlide {
  return {
    priority: row.priority,
    image: row.imageUrl,
    ...(row.imageKey ? { imageKey: row.imageKey } : {}),
    title: row.title,
    subtitle: row.subtitle,
    duration: row.duration,
    action: row.action,
  };
}

export class HomeHeroSliderRepository {
  constructor(private database: IDatabaseClient = advertisementsDbClient) {}

  async get(): Promise<HomeHeroRecord> {
    let row = await this.getRow();
    if (!row) {
      await this.seed();
      row = await this.getRow();
    }
    if (!row) throw new Error("homeHeroSliderNotFound");

    await this.ensureNormalizedSlides(row.draftJson, row.publishedJson);
    const [draftSlides, publishedSlides] = await Promise.all([
      this.getSlides("draft"),
      this.getSlides("published"),
    ]);
    const draftBase = parseConfig(row.draftJson);
    const publishedBase = parseConfig(row.publishedJson);
    await this.ensurePublicationHistory(
      { ...publishedBase, slides: publishedSlides },
      row.version,
      row.publishedAt,
      row.publishedBy ?? "system-seed",
    );
    return {
      id: HOME_HERO_SLIDER_ID,
      draft: { ...draftBase, slides: draftSlides },
      published: { ...publishedBase, slides: publishedSlides },
      status: row.status === "draft" ? "draft" : "published",
      version: row.version,
      revision: row.revision,
      schemaVersion: row.schemaVersion,
      checkIntervalMinutes: row.checkIntervalMinutes,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
      updatedBy: row.updatedBy,
      publishedBy: row.publishedBy,
    };
  }

  async saveDraft(
    config: HomeHeroConfig,
    checkIntervalMinutes: number,
    actorUid: string,
    expectedRevision: number,
  ): Promise<HomeHeroRecord> {
    await this.assertRevision(expectedRevision);
    const now = new Date().toISOString();
    await this.database.db.transaction(async (tx: any) => {
      const result = await tx
        .update(heroSliders)
        .set({
          draftJson: JSON.stringify({ ...config, slides: [] }),
          status: "draft",
          revision: expectedRevision + 1,
          checkIntervalMinutes,
          updatedAt: now,
          updatedBy: actorUid,
        })
        .where(
          and(
            eq(heroSliders.id, HOME_HERO_SLIDER_ID),
            eq(heroSliders.revision, expectedRevision),
          ),
        );
      const changes =
        result?.changes ?? result?.rowsAffected ?? result?.length ?? 1;
      if (changes === 0) throw new Error("heroSliderRevisionConflict");
      await this.replaceSlides(tx, "draft", config);
    });
    return this.get();
  }

  async publish(
    config: HomeHeroConfig,
    checkIntervalMinutes: number,
    actorUid: string,
    expectedRevision: number,
  ): Promise<HomeHeroRecord> {
    const current = await this.get();
    if (current.revision !== expectedRevision)
      throw new Error("heroSliderRevisionConflict");
    const now = new Date().toISOString();
    const nextVersion = current.version + 1;
    const removedKeys = current.published.slides
      .map((slide) => slide.imageKey)
      .filter((key): key is string => Boolean(key))
      .filter((key) => !config.slides.some((slide) => slide.imageKey === key));

    await this.database.db.transaction(async (tx: any) => {
      const compactConfig = JSON.stringify({ ...config, slides: [] });
      const result = await tx
        .update(heroSliders)
        .set({
          draftJson: compactConfig,
          publishedJson: compactConfig,
          status: "published",
          version: nextVersion,
          revision: expectedRevision + 1,
          checkIntervalMinutes,
          updatedAt: now,
          publishedAt: now,
          updatedBy: actorUid,
          publishedBy: actorUid,
        })
        .where(
          and(
            eq(heroSliders.id, HOME_HERO_SLIDER_ID),
            eq(heroSliders.revision, expectedRevision),
          ),
        );
      const changes =
        result?.changes ?? result?.rowsAffected ?? result?.length ?? 1;
      if (changes === 0) throw new Error("heroSliderRevisionConflict");
      await this.replaceSlides(tx, "draft", config);
      await this.replaceSlides(tx, "published", config);
      await tx.insert(heroSliderPublications).values({
        sliderId: HOME_HERO_SLIDER_ID,
        version: nextVersion,
        configJson: JSON.stringify(config),
        publishedBy: actorUid,
        publishedAt: now,
      });
      if (removedKeys.length) {
        const deleteAfter = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        await tx.insert(advertisementImageCleanup).values(
          removedKeys.map((imageKey) => ({
            imageKey,
            storageProfileId: HOME_HERO_SLIDER_ID,
            queuedAt: now,
            deleteAfter,
            status: "pending",
          })),
        );
      }
    });
    return this.get();
  }

  async listPublications(limit = 20): Promise<HomeHeroPublication[]> {
    return this.database.db
      .select({
        id: heroSliderPublications.id,
        version: heroSliderPublications.version,
        publishedBy: heroSliderPublications.publishedBy,
        publishedAt: heroSliderPublications.publishedAt,
      })
      .from(heroSliderPublications)
      .where(eq(heroSliderPublications.sliderId, HOME_HERO_SLIDER_ID))
      .orderBy(desc(heroSliderPublications.id))
      .limit(limit);
  }

  async getPublicationConfig(id: number): Promise<HomeHeroConfig | null> {
    const rows = await this.database.db
      .select({ configJson: heroSliderPublications.configJson })
      .from(heroSliderPublications)
      .where(
        and(
          eq(heroSliderPublications.id, id),
          eq(heroSliderPublications.sliderId, HOME_HERO_SLIDER_ID),
        ),
      )
      .limit(1);
    return rows[0] ? parseConfig(rows[0].configJson) : null;
  }

  async dueImageCleanup() {
    return this.database.db
      .select()
      .from(advertisementImageCleanup)
      .where(
        and(
          eq(advertisementImageCleanup.status, "pending"),
          lte(advertisementImageCleanup.deleteAfter, new Date().toISOString()),
        ),
      )
      .limit(25);
  }

  async markImageCleanup(id: number, status: "deleted" | "failed") {
    await this.database.db
      .update(advertisementImageCleanup)
      .set({ status })
      .where(eq(advertisementImageCleanup.id, id));
  }

  private async getRow() {
    const rows = await this.database.db
      .select()
      .from(heroSliders)
      .where(eq(heroSliders.id, HOME_HERO_SLIDER_ID))
      .limit(1);
    return rows[0] ?? null;
  }

  private async getSlides(stage: SliderStage): Promise<HomeHeroSlide[]> {
    const rows = await this.database.db
      .select()
      .from(heroSliderSlides)
      .where(
        and(
          eq(heroSliderSlides.sliderId, HOME_HERO_SLIDER_ID),
          eq(heroSliderSlides.stage, stage),
        ),
      )
      .orderBy(asc(heroSliderSlides.priority));
    return rows.map(rowToSlide);
  }

  private async replaceSlides(tx: any, stage: SliderStage, config: HomeHeroConfig) {
    await tx.delete(heroSliderSlides)
      .where(
        and(
          eq(heroSliderSlides.sliderId, HOME_HERO_SLIDER_ID),
          eq(heroSliderSlides.stage, stage),
        ),
      );
    const rows = slideRows(config, stage);
    if (rows.length > 0) {
      await tx.insert(heroSliderSlides).values(rows);
    }
  }

  private async ensureNormalizedSlides(
    draftJson: string,
    publishedJson: string,
  ) {
    const rows = await this.database.db
      .select({ stage: heroSliderSlides.stage })
      .from(heroSliderSlides)
      .where(eq(heroSliderSlides.sliderId, HOME_HERO_SLIDER_ID))
      .limit(1);
    if (rows.length) return;
    const draft = parseConfig(draftJson);
    const published = parseConfig(publishedJson);
    await this.database.db.transaction(async (tx: any) => {
      await this.replaceSlides(tx, "draft", draft);
      await this.replaceSlides(tx, "published", published);
    });
  }

  private async assertRevision(expectedRevision: number) {
    const current = await this.get();
    if (current.revision !== expectedRevision)
      throw new Error("heroSliderRevisionConflict");
  }

  private async ensurePublicationHistory(
    config: HomeHeroConfig,
    version: number,
    publishedAt: string,
    publishedBy: string,
  ) {
    const rows = await this.database.db
      .select({ id: heroSliderPublications.id })
      .from(heroSliderPublications)
      .where(
        and(
          eq(heroSliderPublications.sliderId, HOME_HERO_SLIDER_ID),
          eq(heroSliderPublications.version, version),
        ),
      )
      .limit(1);
    if (rows.length) return;
    await this.database.db.insert(heroSliderPublications).values({
      sliderId: HOME_HERO_SLIDER_ID,
      version,
      configJson: JSON.stringify(config),
      publishedBy,
      publishedAt,
    });
  }

  private async seed(): Promise<void> {
    const seed = homeHeroSeedSchema.parse(seedDocument);
    const now = new Date().toISOString();
    await this.database.db.insert(heroSliders).values({
      id: HOME_HERO_SLIDER_ID,
      draftJson: JSON.stringify(seed.config),
      publishedJson: JSON.stringify(seed.config),
      status: "published",
      version: 1,
      revision: 1,
      schemaVersion: seed.schemaVersion,
      checkIntervalMinutes: 15,
      updatedAt: now,
      publishedAt: now,
    });
  }
}

export const homeHeroSliderRepository = new HomeHeroSliderRepository();
