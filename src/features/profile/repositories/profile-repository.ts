import "server-only";

import { eq, or, and, inArray } from "drizzle-orm";
import { profileDbClient } from "@/core/database/profile-db-client";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import { userProfiles } from "@/core/database/profile/profile.schema";
import type { UserProfileRow } from "@/core/database/profile/profile.schema";
import { userSpecialties } from "@/core/database/profile/user-specialties.schema";
import type { ProfileContactsData } from "../entities/profile-contacts.entity";
import {
  EMPTY_PROFILE_SHOWCASE,
  EMPTY_STORE_DETAILS,
  type ProfileShowcaseSettings,
  type StoreDetailsData,
} from "../entities/store-details.entity";
import type { ProfileRatingSettings } from "../entities/profile-review.entity";
import type {
  ProfileImageKeys,
  IProfileRepository,
} from "./profile-repository.interface";
import {
  EMPTY_PROFILE_SPECIALTIES,
  type ProfileSpecialtiesSelection,
} from "../entities/profile-specialties.entity";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
  type ReturnShippingPayer,
} from "../entities/profile-fulfillment-settings.entity";
import {
  SPECIALTY_COLUMN_NAMES,
  selectedSpecialtyColumns,
  columnBySelection,
  columnByDoctorAppointment,
} from "./specialty-columns.server";

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function rowToContacts(
  row: typeof userProfiles.$inferSelect,
): ProfileContactsData {
  return {
    phones: parseJsonArray(row.phonesJson),
    emails: parseJsonArray(row.emailsJson),
    websites: parseJsonArray(row.websitesJson),
    socialLinks: parseJsonArray(row.socialLinksJson),
    locations: parseJsonArray(row.locationJson),
  };
}

function normalizeStoreDetails(value: unknown): StoreDetailsData {
  if (!value || typeof value !== "object") return EMPTY_STORE_DETAILS;
  const details = value as Partial<Record<keyof StoreDetailsData, unknown>>;

  return {
    storeName: typeof details.storeName === "string" ? details.storeName : "",
    storeDescription:
      typeof details.storeDescription === "string"
        ? details.storeDescription
        : "",
    storeStory:
      typeof details.storeStory === "string" ? details.storeStory : "",
    ratingSettings: normalizeRatingSettings(details.ratingSettings),
    profileShowcase: normalizeProfileShowcase(details.profileShowcase),
  };
}

function normalizeProfileShowcase(value: unknown): ProfileShowcaseSettings {
  if (!value || typeof value !== "object") return EMPTY_PROFILE_SHOWCASE;
  const showcase = value as Partial<ProfileShowcaseSettings>;
  const trending =
    showcase.trending && typeof showcase.trending === "object"
      ? showcase.trending
      : EMPTY_PROFILE_SHOWCASE.trending;
  const trendingValue = trending as {
    label?: unknown;
    items?: unknown;
  };
  return {
    featuredProductIds: Array.isArray(showcase.featuredProductIds)
      ? Array.from(
          new Set(
            showcase.featuredProductIds.filter(
              (id): id is string => typeof id === "string" && id.trim().length > 0,
            ),
          ),
        ).slice(0, 20)
      : [],
    trending: {
      label:
        typeof trendingValue.label === "string" && trendingValue.label.trim()
          ? trendingValue.label.trim()
          : EMPTY_PROFILE_SHOWCASE.trending.label,
      items: Array.isArray(trendingValue.items)
        ? trendingValue.items
            .map((item, index) => {
              const row = item as { id?: unknown; label?: unknown };
              const label = typeof row.label === "string" ? row.label.trim() : "";
              if (!label) return null;
              return {
                id:
                  typeof row.id === "string" && row.id.trim()
                    ? row.id.trim()
                    : `trending-${index}`,
                label,
              };
            })
            .filter((item): item is { id: string; label: string } => Boolean(item))
            .slice(0, 20)
        : [],
    },
    customRequestEnabled:
      typeof showcase.customRequestEnabled === "boolean"
        ? showcase.customRequestEnabled
        : EMPTY_PROFILE_SHOWCASE.customRequestEnabled,
  };
}

function normalizeRatingSettings(value: unknown): ProfileRatingSettings {
  if (!value || typeof value !== "object") {
    return EMPTY_STORE_DETAILS.ratingSettings;
  }
  const settings = value as Partial<ProfileRatingSettings>;
  return {
    enabled:
      typeof settings.enabled === "boolean"
        ? settings.enabled
        : EMPTY_STORE_DETAILS.ratingSettings.enabled,
    mode:
      settings.mode === "stars" || settings.mode === "stars-comments"
        ? settings.mode
        : EMPTY_STORE_DETAILS.ratingSettings.mode,
  };
}

function normalizeFulfillmentSettings(
  value: unknown,
): ProfileFulfillmentSettings {
  if (!value || typeof value !== "object") {
    return EMPTY_PROFILE_FULFILLMENT_SETTINGS;
  }
  const settings = value as Partial<ProfileFulfillmentSettings>;
  const returns =
    settings.returns && typeof settings.returns === "object"
      ? settings.returns
      : EMPTY_PROFILE_FULFILLMENT_SETTINGS.returns;
  const payer = (returns as { returnShippingPayer?: unknown })
    .returnShippingPayer;
  const normalizedPayer: ReturnShippingPayer =
    payer === "buyer" || payer === "seller" || payer === "case_by_case"
      ? payer
      : EMPTY_PROFILE_FULFILLMENT_SETTINGS.returns.returnShippingPayer;
  const days = Number(
    (returns as { returnWindowDays?: unknown }).returnWindowDays,
  );
  const shippingPricing =
    settings.shippingPricing && typeof settings.shippingPricing === "object"
      ? settings.shippingPricing
      : EMPTY_PROFILE_FULFILLMENT_SETTINGS.shippingPricing;
  const shippingMode = (shippingPricing as { mode?: unknown }).mode;
  const money = (amount: unknown, fallback: number) => {
    const value = Number(amount);
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  };

  return {
    selfDeliveryEnabled: false,
    carrierUids: Array.isArray(settings.carrierUids)
      ? Array.from(
          new Set(
            settings.carrierUids.filter(
              (uid): uid is string =>
                typeof uid === "string" && uid.trim().length > 0,
            ),
          ),
        )
      : [],
    shippingPricing: {
      mode:
        shippingMode === "free" ||
        shippingMode === "flat" ||
        shippingMode === "by_location"
          ? shippingMode
          : EMPTY_PROFILE_FULFILLMENT_SETTINGS.shippingPricing.mode,
      flatRate: money(
        (shippingPricing as { flatRate?: unknown }).flatRate,
        EMPTY_PROFILE_FULFILLMENT_SETTINGS.shippingPricing.flatRate,
      ),
      locationBaseRate: money(
        (shippingPricing as { locationBaseRate?: unknown }).locationBaseRate,
        EMPTY_PROFILE_FULFILLMENT_SETTINGS.shippingPricing.locationBaseRate,
      ),
      specialVehicleFee: money(
        (shippingPricing as { specialVehicleFee?: unknown }).specialVehicleFee,
        EMPTY_PROFILE_FULFILLMENT_SETTINGS.shippingPricing.specialVehicleFee,
      ),
      freeShippingThreshold: money(
        (shippingPricing as { freeShippingThreshold?: unknown })
          .freeShippingThreshold,
        EMPTY_PROFILE_FULFILLMENT_SETTINGS.shippingPricing.freeShippingThreshold,
      ),
      notes:
        typeof (shippingPricing as { notes?: unknown }).notes === "string"
          ? (shippingPricing as { notes: string }).notes
          : "",
    },
    returns: {
      enabled: (returns as { enabled?: unknown }).enabled === true,
      returnWindowDays: Number.isInteger(days)
        ? Math.min(365, Math.max(0, days))
        : EMPTY_PROFILE_FULFILLMENT_SETTINGS.returns.returnWindowDays,
      policyText:
        typeof (returns as { policyText?: unknown }).policyText === "string"
          ? (returns as { policyText: string }).policyText
          : "",
      returnShippingPayer: normalizedPayer,
    },
  };
}

function rowToStoreDetails(row: {
  storeDetailsJson: string;
  ratingSettingsJson: string;
}): StoreDetailsData {
  const details = normalizeStoreDetails(
    parseJson(row.storeDetailsJson, EMPTY_STORE_DETAILS),
  );
  const ratingSettings = parseJson(
    row.ratingSettingsJson,
    EMPTY_STORE_DETAILS.ratingSettings,
  );
  return { ...details, ratingSettings: normalizeRatingSettings(ratingSettings) };
}

function parseImageKeys(value: string | null | undefined): string[] {
  if (!value) return [];
  const parsed = parseJson<unknown>(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

export class ProfileRepository implements IProfileRepository {
  constructor(private database: IDatabaseClient = profileDbClient) {}

  async getByUid(uid: string): Promise<ProfileContactsData | null> {
    const rows = await this.database.db
      .select({
        phonesJson: userProfiles.phonesJson,
        emailsJson: userProfiles.emailsJson,
        websitesJson: userProfiles.websitesJson,
        socialLinksJson: userProfiles.socialLinksJson,
        locationJson: userProfiles.locationJson,
      })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (rows.length === 0) return null;
    return rowToContacts(rows[0]);
  }

  async upsert(uid: string, data: ProfileContactsData): Promise<void> {
    const payload = {
      phonesJson: JSON.stringify(data.phones),
      emailsJson: JSON.stringify(data.emails),
      socialLinksJson: JSON.stringify(data.socialLinks),
      websitesJson: JSON.stringify(data.websites),
      locationJson: JSON.stringify(data.locations),
    };

    const existing = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (existing.length === 0) {
      await this.database.db.insert(userProfiles).values({
        uid,
        ...payload,
      });
      return;
    }

    await this.database.db
      .update(userProfiles)
      .set(payload)
      .where(eq(userProfiles.uid, uid));
  }

  async getImageKeys(uid: string): Promise<ProfileImageKeys | null> {
    const rows = await this.database.db
      .select({
        avatarImageKey: userProfiles.avatarImageKey,
        coverImageKey: userProfiles.coverImageKey,
        coverImageKeysJson: userProfiles.coverImageKeysJson,
      })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (rows.length === 0) return null;
    const coverImageKeys = parseImageKeys(rows[0].coverImageKeysJson);
    const legacyCoverImageKey = rows[0].coverImageKey ?? null;
    const normalizedCoverImageKeys =
      coverImageKeys.length > 0
        ? coverImageKeys
        : legacyCoverImageKey
          ? [legacyCoverImageKey]
          : [];

    return {
      avatarImageKey: rows[0].avatarImageKey ?? null,
      coverImageKey: normalizedCoverImageKeys[0] ?? legacyCoverImageKey,
      coverImageKeys: normalizedCoverImageKeys,
    };
  }

  async upsertImageKeys(uid: string, keys: ProfileImageKeys): Promise<void> {
    const existing = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    const payload = {
      avatarImageKey: keys.avatarImageKey,
      coverImageKey: keys.coverImageKeys[0] ?? keys.coverImageKey,
      coverImageKeysJson: JSON.stringify(keys.coverImageKeys.slice(0, 3)),
    };

    if (existing.length === 0) {
      await this.database.db.insert(userProfiles).values({
        uid,
        ...payload,
      });
      return;
    }

    await this.database.db
      .update(userProfiles)
      .set(payload)
      .where(eq(userProfiles.uid, uid));
  }

  async getStoreDetails(uid: string): Promise<StoreDetailsData | null> {
    const rows = (await this.database.execute(
      "SELECT store_details_json, rating_settings_json FROM user_profiles WHERE uid = ? LIMIT 1",
      [uid],
    )) as Array<{
      store_details_json: string;
      rating_settings_json: string;
    }>;

    if (rows.length === 0) return null;
    return rowToStoreDetails({
      storeDetailsJson: rows[0].store_details_json,
      ratingSettingsJson: rows[0].rating_settings_json,
    });
  }

  async upsertStoreDetails(
    uid: string,
    details: StoreDetailsData,
  ): Promise<void> {
    const { ratingSettings, ...rest } = details;
    const payload = {
      storeDetailsJson: JSON.stringify(rest),
      ratingSettingsJson: JSON.stringify(ratingSettings),
    };

    const existing = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (existing.length === 0) {
      await this.database.db.insert(userProfiles).values({
        uid,
        ...payload,
      });
      return;
    }

    await this.database.db
      .update(userProfiles)
      .set(payload)
      .where(eq(userProfiles.uid, uid));
  }

  async getFulfillmentSettings(
    uid: string,
  ): Promise<ProfileFulfillmentSettings | null> {
    const rows = await this.database.db
      .select({
        fulfillmentSettingsJson: userProfiles.fulfillmentSettingsJson,
      })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (rows.length === 0) return null;
    return normalizeFulfillmentSettings(
      parseJson(
        rows[0].fulfillmentSettingsJson,
        EMPTY_PROFILE_FULFILLMENT_SETTINGS,
      ),
    );
  }

  async upsertFulfillmentSettings(
    uid: string,
    settings: ProfileFulfillmentSettings,
  ): Promise<void> {
    const payload = {
      fulfillmentSettingsJson: JSON.stringify(settings),
    };

    const existing = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (existing.length === 0) {
      await this.database.db.insert(userProfiles).values({
        uid,
        ...payload,
      });
      return;
    }

    await this.database.db
      .update(userProfiles)
      .set(payload)
      .where(eq(userProfiles.uid, uid));
  }

  async getDeliveryServiceUids(uids: string[]): Promise<string[]> {
    const uniqueUids = Array.from(new Set(uids)).filter(Boolean);
    if (uniqueUids.length === 0) return [];
    const rows = await this.database.db
      .select({ uid: userSpecialties.uid })
      .from(userSpecialties)
      .where(
        and(
          inArray(userSpecialties.uid, uniqueUids),
          eq(userSpecialties.delivery_services_46, 1),
        ),
      );
    return rows.map((row: { uid: string }) => row.uid);
  }

  async getSpecialties(
    uid: string,
  ): Promise<ProfileSpecialtiesSelection | null> {
    const rows = await this.database.db
      .select({ specialtiesJson: userProfiles.specialtiesJson })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);
    if (rows.length === 0) return null;
    return parseJson(rows[0].specialtiesJson, EMPTY_PROFILE_SPECIALTIES);
  }

  async upsertSpecialties(
    uid: string,
    selection: ProfileSpecialtiesSelection,
  ): Promise<void> {
    const payload = { specialtiesJson: JSON.stringify(selection) };
    const existing = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (existing.length === 0) {
      await this.database.db.insert(userProfiles).values({ uid, ...payload });
    } else {
      await this.database.db
        .update(userProfiles)
        .set(payload)
        .where(eq(userProfiles.uid, uid));
    }

    const enabled = selectedSpecialtyColumns(selection);
    const values = SPECIALTY_COLUMN_NAMES.map((column) =>
      enabled.has(column) ? 1 : 0,
    );
    const quotedColumns = SPECIALTY_COLUMN_NAMES.map(
      (column) => `\`${column}\``,
    ).join(", ");
    const placeholders = SPECIALTY_COLUMN_NAMES.map(() => "?").join(", ");
    const updates = SPECIALTY_COLUMN_NAMES.map(
      (column) => `\`${column}\` = excluded.\`${column}\``,
    ).join(", ");
    await this.database.execute(
      `INSERT INTO user_specialties (uid, ${quotedColumns}) VALUES (?, ${placeholders}) ON CONFLICT(uid) DO UPDATE SET ${updates}`,
      [uid, ...values],
    );
  }

  async getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ): Promise<UserProfileRow[]> {
    // Try doctor-appointment mapping first (for medical specialties), then regular subcategories
    const columnName = columnByDoctorAppointment.get(subcategoryId) ||
                      columnBySelection.get(`${categoryId}:${subcategoryId}`) ||
                      columnBySelection.get(`${categoryId}:${categoryId}`);
    
    if (!columnName) return [];

    const columns = [columnName];
    if (categoryId !== 46) { // 46 is delivery services, handled separately
      const parentColumn = columnBySelection.get(`${categoryId}:${categoryId}`);
      if (parentColumn && parentColumn !== columnName) columns.push(parentColumn);
    }

    const specialtyCondition = columns
      .map((column) => `s.\`${column}\` = 1`)
      .join(" OR ");
    const params: Array<string | number> = [];
    const searchText = search?.trim().toLowerCase();
    let searchCondition = "";
    if (searchText) {
      const pattern = `%${searchText}%`;
      searchCondition =
        " AND (lower(p.uid) LIKE ? OR lower(p.store_details_json) LIKE ?)";
      params.push(pattern, pattern);
    }
    let ratingCondition = "";
    if (typeof minRating === "number" && Number.isFinite(minRating) && minRating >= 1) {
      ratingCondition = " AND COALESCE(r.avg_rating, 0) >= ?";
      params.push(minRating);
    }
    params.push(Math.max(1, limit), Math.max(0, offset));

    const rows = (await this.database.execute(
      `SELECT
        p.uid,
        p.phones_json,
        p.emails_json,
        p.social_links_json,
        p.websites_json,
        p.location_json,
        p.avatar_image_key,
        p.cover_image_key,
        p.cover_image_keys_json,
        p.store_details_json,
        p.specialties_json,
        p.rating_settings_json,
        p.fulfillment_settings_json
      FROM user_specialties s
      INNER JOIN user_profiles p ON p.uid = s.uid
      LEFT JOIN (
        SELECT target_uid, AVG(rating) avg_rating
        FROM profile_reviews
        GROUP BY target_uid
      ) r ON r.target_uid = p.uid
      WHERE (${specialtyCondition})${searchCondition}${ratingCondition}
      ORDER BY p.uid ASC
      LIMIT ? OFFSET ?`,
      params,
    )) as Array<{
      uid: string;
      phones_json: string;
      emails_json: string;
      social_links_json: string;
      websites_json: string;
      location_json: string | null;
      avatar_image_key: string | null;
      cover_image_key: string | null;
      cover_image_keys_json: string;
      store_details_json: string;
      specialties_json: string;
      rating_settings_json: string;
      fulfillment_settings_json: string;
    }>;

    return rows.map((row) => ({
      uid: row.uid,
      phonesJson: row.phones_json,
      emailsJson: row.emails_json,
      socialLinksJson: row.social_links_json,
      websitesJson: row.websites_json,
      locationJson: row.location_json,
      avatarImageKey: row.avatar_image_key,
      coverImageKey: row.cover_image_key,
      coverImageKeysJson: row.cover_image_keys_json,
      storeDetailsJson: row.store_details_json,
      specialtiesJson: row.specialties_json,
      ratingSettingsJson: row.rating_settings_json,
      fulfillmentSettingsJson: row.fulfillment_settings_json,
    })) as UserProfileRow[];
  }
}

export const profileRepository = new ProfileRepository();
