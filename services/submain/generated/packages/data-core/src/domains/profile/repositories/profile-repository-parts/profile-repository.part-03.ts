import { productsDataSource, profilesDataSource } from "../../../../core";
import "server-only";
import type { IDatabaseClient } from "../../../../core/database/database-client.interface";
import type { UserProfileRow } from "../../../../core/database/profile/profile.schema";
import type {
  ProfileContactPointRow,
  ProfileDeliveryCarrierRow,
  ProfileImageRow,
  ProfileLocationRow,
  ProfileTrendingItemRow,
  ProfileWorkingHourRow,
} from "../../../../core/database/profile/profile.schema";
import type { ProfileContactsData } from "@/features/profile/entities/profile-contacts.entity";
import { MAX_PROFILE_COVER_IMAGES } from "../../profile-cover-limits";
import {
  EMPTY_PROFILE_SHOWCASE,
  EMPTY_STORE_DETAILS,
  type StoreDetailsData,
} from "@/features/profile/entities/store-details.entity";
import type {
  ProfileImageKeys,
  IProfileRepository,
} from "../profile-repository.interface";
import {
  EMPTY_PROFILE_SPECIALTIES,
  type ProfileSpecialtiesSelection,
} from "@/features/profile/entities/profile-specialties.entity";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
} from "@/features/profile/entities/profile-fulfillment-settings.entity";
import {
  EMPTY_PROFILE_WORKING_HOURS,
  WORKING_DAY_LABELS,
  normalizeProfileWorkingHours,
  type WorkingDayId,
} from "@/features/profile-working-hours";
import {
  SPECIALTY_COLUMN_NAMES,
  selectedSpecialtyColumns,
  columnBySelection,
  columnByDoctorAppointment,
} from "../specialty-columns.server";
import { ProfilePart2 } from "./profile-repository.part-02";
const DELIVERY_SERVICES_SPECIALTY_COLUMN = columnBySelection.get("46:46");
if (!DELIVERY_SERVICES_SPECIALTY_COLUMN) {
  throw new Error("Delivery Services specialty column mapping is missing");
}
const DAY_TO_INDEX = new Map<WorkingDayId, number>(
  WORKING_DAY_LABELS.map((day, index) => [day.id, index]),
);
const INDEX_TO_DAY = new Map<number, WorkingDayId>(
  WORKING_DAY_LABELS.map((day, index) => [index, day.id]),
);
function nowIso(): string {
  return new Date().toISOString();
}
function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
function scopedContactId(uid: string, type: string, id: string): string {
  return `${uid}:${type}:${id}`;
}
function publicContactId(uid: string, type: string, id: string): string {
  const typedPrefix = `${uid}:${type}:`;
  if (id.startsWith(typedPrefix)) return id.slice(typedPrefix.length);
  const legacyPrefix = `${uid}:`;
  return id.startsWith(legacyPrefix) ? id.slice(legacyPrefix.length) : id;
}
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("20") && digits.length === 12
    ? digits.slice(2)
    : digits;
}
function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

export abstract class ProfilePart3 extends ProfilePart2 {
  async upsertImageKeys(uid: string, keys: ProfileImageKeys): Promise<void> {
    await this.ensureProfile(uid);
    const timestamp = nowIso();
    const coverImageKeys = Array.from(
      new Set(keys.coverImageKeys.map((key) => key.trim()).filter(Boolean)),
    ).slice(0, MAX_PROFILE_COVER_IMAGES);
    await this.database.execute("DELETE FROM profile_images WHERE uid = ?", [
      uid,
    ]);
    const rows = [
      ...(keys.avatarImageKey
        ? [
            {
              id: createId("image"),
              uid,
              imageKey: keys.avatarImageKey,
              imageType: "avatar",
              isPrimary: true,
              sortOrder: 0,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ]
        : []),
      ...coverImageKeys.map((imageKey, index) => ({
        id: createId("image"),
        uid,
        imageKey,
        imageType: "cover",
        isPrimary: index === 0,
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    ];
    await this.insertRows(
      "profile_images",
      [
        "id",
        "uid",
        "image_key",
        "image_type",
        "is_primary",
        "sort_order",
        "created_at",
        "updated_at",
      ],
      rows.map((row) => [
        row.id,
        row.uid,
        row.imageKey,
        row.imageType,
        row.isPrimary,
        row.sortOrder,
        row.createdAt,
        row.updatedAt,
      ]),
      `ON CONFLICT(uid, image_key, image_type) DO UPDATE SET
         is_primary = excluded.is_primary,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at`,
    );
  }

  async getStoreDetails(uid: string): Promise<StoreDetailsData | null> {
    const rows = await this.database.execute(
      `SELECT store_name AS storeName, store_description AS storeDescription, store_story AS storeStory, rating_enabled AS ratingEnabled, rating_mode AS ratingMode, trending_label AS trendingLabel, custom_request_enabled AS customRequestEnabled FROM user_profiles WHERE uid = ? LIMIT 1`,
      [uid],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    const featured = (await this.database.execute(
      "SELECT product_id AS productId FROM profile_featured_products WHERE uid = ? ORDER BY sort_order",
      [uid],
    )) as Array<{ productId: string }>;
    const trending = (await this.database.execute(
      "SELECT id, label FROM profile_trending_items WHERE uid = ? ORDER BY sort_order",
      [uid],
    )) as ProfileTrendingItemRow[];
    const workingHours = await this.getWorkingHours(uid);

    return {
      storeName: row.storeName,
      storeDescription: row.storeDescription,
      storeStory: row.storeStory,
      ratingSettings: {
        enabled: row.ratingEnabled,
        mode:
          row.ratingMode === "stars" || row.ratingMode === "stars-comments"
            ? row.ratingMode
            : "stars-comments",
      },
      profileShowcase: {
        featuredProductIds: featured.map((item) => item.productId),
        trending: {
          label: row.trendingLabel || EMPTY_PROFILE_SHOWCASE.trending.label,
          items: trending.map((item) => ({ id: item.id, label: item.label })),
        },
        customRequestEnabled: row.customRequestEnabled,
      },
      workingHours,
    };
  }

  async upsertStoreDetails(
    uid: string,
    details: StoreDetailsData,
  ): Promise<void> {
    await this.ensureProfile(uid);
    const timestamp = nowIso();
    const normalizedWorkingHours = normalizeProfileWorkingHours(
      details.workingHours,
    );
    await this.database.update(
      "user_profiles",
      {
        store_name: details.storeName.trim(),
        store_description: details.storeDescription.trim(),
        store_story: details.storeStory.trim(),
        store_name_search: normalizeSearchText(details.storeName),
        store_description_search: normalizeSearchText(details.storeDescription),
        custom_request_enabled: details.profileShowcase.customRequestEnabled,
        trending_label:
          details.profileShowcase.trending.label.trim() ||
          EMPTY_PROFILE_SHOWCASE.trending.label,
        rating_enabled: details.ratingSettings.enabled,
        rating_mode: details.ratingSettings.mode,
      },
      { uid },
    );

    await this.database.execute(
      "DELETE FROM profile_featured_products WHERE uid = ?",
      [uid],
    );
    const featured = Array.from(
      new Set(details.profileShowcase.featuredProductIds),
    )
      .filter(Boolean)
      .slice(0, 20)
      .map((productId, index) => ({
        uid,
        productId,
        sortOrder: index,
        createdAt: timestamp,
      }));
    await this.insertRows(
      "profile_featured_products",
      ["uid", "product_id", "sort_order", "created_at"],
      featured.map((row) => [
        row.uid,
        row.productId,
        row.sortOrder,
        row.createdAt,
      ]),
    );

    await this.database.execute(
      "DELETE FROM profile_trending_items WHERE uid = ?",
      [uid],
    );
    const trending = details.profileShowcase.trending.items
      .filter((item) => item.label.trim())
      .slice(0, 20)
      .map((item, index) => ({
        id: item.id || createId("trending"),
        uid,
        label: item.label.trim(),
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
    await this.insertRows(
      "profile_trending_items",
      ["id", "uid", "label", "sort_order", "created_at", "updated_at"],
      trending.map((row) => [
        row.id,
        row.uid,
        row.label,
        row.sortOrder,
        row.createdAt,
        row.updatedAt,
      ]),
    );

    await this.saveWorkingHours(uid, normalizedWorkingHours);
  }
}
