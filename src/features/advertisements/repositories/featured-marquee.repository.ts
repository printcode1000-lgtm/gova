import "server-only";

import { eq } from "drizzle-orm";

import { advertisementsDbClient } from "@/core/database/advertisements-db-client";
import { featuredMarquee } from "@/core/database/advertisements/advertisements.schema";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import {
  FEATURED_MARQUEE_ID,
  type FeaturedMarqueeConfig,
  type FeaturedMarqueeRecord,
} from "../entities/featured-marquee.entity";

function parseConfig(value: string): FeaturedMarqueeConfig {
  return JSON.parse(value) as FeaturedMarqueeConfig;
}

export class FeaturedMarqueeRepository {
  constructor(private database: IDatabaseClient = advertisementsDbClient) {}

  async get(): Promise<FeaturedMarqueeRecord> {
    const row = await this.getRow();
    if (!row) {
      return {
        id: FEATURED_MARQUEE_ID,
        config: { productIds: [] },
        version: 0,
        checkIntervalMinutes: 15,
        updatedAt: "",
        updatedBy: null,
      };
    }

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
    const values = {
      productIdsJson: JSON.stringify(config),
      version: current.version + 1,
      checkIntervalMinutes,
      updatedAt: new Date().toISOString(),
      updatedBy: actorUid,
    };
    if (await this.getRow()) {
      await this.database.db
        .update(featuredMarquee)
        .set(values)
        .where(eq(featuredMarquee.id, FEATURED_MARQUEE_ID));
    } else {
      await this.database.db.insert(featuredMarquee).values({
        id: FEATURED_MARQUEE_ID,
        ...values,
      });
    }
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
}

export const featuredMarqueeRepository = new FeaturedMarqueeRepository();
