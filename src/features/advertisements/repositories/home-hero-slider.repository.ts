import "server-only";

import { eq } from "drizzle-orm";

import { advertisementsDbClient } from "@/core/database/advertisements-db-client";
import { heroSlider } from "@/core/database/advertisements/advertisements.schema";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import seedDocument from "@/features/advertisements/config/home-hero-slider.seed.json";
import {
  HOME_HERO_SLIDER_ID,
  type HomeHeroConfig,
  type HomeHeroRecord,
} from "../entities/home-hero-slider.entity";
import { homeHeroSeedSchema } from "../validation/home-hero-slider.schema";

function parseConfig(value: string): HomeHeroConfig {
  return JSON.parse(value) as HomeHeroConfig;
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

    return {
      id: HOME_HERO_SLIDER_ID,
      config: parseConfig(row.configJson),
      version: row.version,
      checkIntervalMinutes: row.checkIntervalMinutes,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async save(
    config: HomeHeroConfig,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<HomeHeroRecord> {
    const current = await this.get();
    await this.database.db
      .update(heroSlider)
      .set({
        configJson: JSON.stringify(config),
        version: current.version + 1,
        checkIntervalMinutes,
        updatedAt: new Date().toISOString(),
        updatedBy: actorUid,
      })
      .where(eq(heroSlider.id, HOME_HERO_SLIDER_ID));
    return this.get();
  }

  private async getRow() {
    const rows = await this.database.db
      .select()
      .from(heroSlider)
      .where(eq(heroSlider.id, HOME_HERO_SLIDER_ID))
      .limit(1);
    return rows[0] ?? null;
  }

  private async seed(): Promise<void> {
    const seed = homeHeroSeedSchema.parse(seedDocument);
    await this.database.db.insert(heroSlider).values({
      id: HOME_HERO_SLIDER_ID,
      configJson: JSON.stringify(seed.config),
      version: 1,
      checkIntervalMinutes: 15,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const homeHeroSliderRepository = new HomeHeroSliderRepository();
