import "server-only";

import { eq } from "drizzle-orm";

import { advertisementsDbClient } from "@/core/database/advertisements-db-client";
import { featuredMarquee } from "@/core/database/advertisements/advertisements.schema";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import seedDocument from "@/features/advertisements/config/featured-marquee.seed.json";
import {
  FEATURED_MARQUEE_ID,
  type FeaturedMarqueeConfig,
  type FeaturedMarqueeRecord,
} from "../entities/featured-marquee.entity";
import { featuredMarqueeSeedSchema } from "../validation/featured-marquee.schema";

function parseConfig(value: string): FeaturedMarqueeConfig {
  return JSON.parse(value) as FeaturedMarqueeConfig;
}

export class FeaturedMarqueeRepository {
  constructor(private database: IDatabaseClient = advertisementsDbClient) {}

  async get(): Promise<FeaturedMarqueeRecord> {
    let row = await this.getRow();
    if (!row) {
      await this.seed();
      row = await this.getRow();
    }
    if (!row) throw new Error("featuredMarqueeNotFound");

    return {
      id: FEATURED_MARQUEE_ID,
      config: parseConfig(row.productIdsJson),
      version: row.version,
      checkIntervalMinutes: row.checkIntervalMinutes,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async save(
    config: FeaturedMarqueeConfig,
    checkIntervalMinutes: number,
    actorUid: string,
  ): Promise<FeaturedMarqueeRecord> {
    const current = await this.get();
    await this.database.db
      .update(featuredMarquee)
      .set({
        productIdsJson: JSON.stringify(config),
        version: current.version + 1,
        checkIntervalMinutes,
        updatedAt: new Date().toISOString(),
        updatedBy: actorUid,
      })
      .where(eq(featuredMarquee.id, FEATURED_MARQUEE_ID));
    return this.get();
  }

  private async getRow() {
    const rows = await this.database.db
      .select()
      .from(featuredMarquee)
      .where(eq(featuredMarquee.id, FEATURED_MARQUEE_ID))
      .limit(1);
    return rows[0] ?? null;
  }

  private async seed(): Promise<void> {
    const seed = featuredMarqueeSeedSchema.parse(seedDocument);
    await this.database.db.insert(featuredMarquee).values({
      id: FEATURED_MARQUEE_ID,
      productIdsJson: JSON.stringify(seed.config),
      version: 1,
      checkIntervalMinutes: 15,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const featuredMarqueeRepository = new FeaturedMarqueeRepository();
