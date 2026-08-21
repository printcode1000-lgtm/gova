import { advertisementsDataSource } from "../../../core";
import "server-only";

import { eq } from "drizzle-orm";

import { heroSlider } from "../../../core/database/advertisements/advertisements.schema";
import type { IDatabaseClient } from "../../../core/database/database-client.interface";
import {
  DEFAULT_HOME_HERO_CONFIG,
  HOME_HERO_SLIDER_ID,
  type HomeHeroConfig,
  type HomeHeroRecord,
  normalizeHomeHeroConfig,
} from "@asol/hero-slider-core";

function parseConfig(value: string): HomeHeroConfig {
  return normalizeHomeHeroConfig(JSON.parse(value));
}

export class HomeHeroSliderRepository {
  constructor(private database: IDatabaseClient = advertisementsDataSource) {}

  async get(): Promise<HomeHeroRecord> {
    const row = await this.getRow();
    if (!row) {
      return {
        id: HOME_HERO_SLIDER_ID,
        config: DEFAULT_HOME_HERO_CONFIG,
        version: 0,
        checkIntervalMinutes: 15,
        updatedAt: "",
        updatedBy: null,
      };
    }

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
    const values = {
      configJson: JSON.stringify(config),
      version: current.version + 1,
      checkIntervalMinutes,
      updatedAt: new Date().toISOString(),
      updatedBy: actorUid,
    };
    if (await this.getRow()) {
      await this.database.db
        .update(heroSlider)
        .set(values)
        .where(eq(heroSlider.id, HOME_HERO_SLIDER_ID));
    } else {
      await this.database.db.insert(heroSlider).values({
        id: HOME_HERO_SLIDER_ID,
        ...values,
      });
    }
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
}

export const homeHeroSliderRepository = new HomeHeroSliderRepository();
