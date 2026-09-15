import { advertisementsDataSource } from "../../../core";
import "server-only";

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
    await this.database.execute(
      `INSERT INTO hero_slider (id, config_json, version, check_interval_minutes, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json, version = excluded.version, check_interval_minutes = excluded.check_interval_minutes, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      [HOME_HERO_SLIDER_ID, values.configJson, values.version, values.checkIntervalMinutes, values.updatedAt, values.updatedBy],
    );
    return this.get();
  }

  private async getRow(): Promise<{ configJson: string; version: number; checkIntervalMinutes: number; updatedAt: string; updatedBy: string | null } | null> {
    const rows = await this.database.execute(
      `SELECT config_json AS configJson, version, check_interval_minutes AS checkIntervalMinutes, updated_at AS updatedAt, updated_by AS updatedBy FROM hero_slider WHERE id = ? LIMIT 1`,
      [HOME_HERO_SLIDER_ID],
    );
    return (rows[0] as any) ?? null;
  }
}

export const homeHeroSliderRepository = new HomeHeroSliderRepository();
