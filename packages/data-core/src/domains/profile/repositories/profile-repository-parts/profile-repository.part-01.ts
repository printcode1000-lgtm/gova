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
import type { ProfileContactsData } from "../../entities";
import {
  EMPTY_PROFILE_SHOWCASE,
  EMPTY_STORE_DETAILS,
  type StoreDetailsData,
} from "../../entities";
import type {
  ProfileImageKeys,
  IProfileRepository,
} from "../profile-repository.interface";
import {
  EMPTY_PROFILE_SPECIALTIES,
  type ProfileSpecialtiesSelection,
} from "../../entities";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
} from "../../entities";
import {
  EMPTY_PROFILE_WORKING_HOURS,
  WORKING_DAY_LABELS,
  normalizeProfileWorkingHours,
  type WorkingDayId,
} from "../../entities";
import {
  SPECIALTY_COLUMN_NAMES,
  selectedSpecialtyColumns,
  columnBySelection,
  columnByDoctorAppointment,
} from "../specialty-columns.server";
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

export abstract class ProfilePart1 implements IProfileRepository {
  constructor(protected database: IDatabaseClient = profilesDataSource) {}

  protected async ensureProfile(uid: string): Promise<void> {
    await this.database.execute(
      "INSERT INTO user_profiles (uid) VALUES (?) ON CONFLICT(uid) DO NOTHING",
      [uid],
    );
  }

  protected async insertRows(
    table: string,
    columns: string[],
    rows: unknown[][],
    conflictClause = "",
  ): Promise<void> {
    if (rows.length === 0) return;
    const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
    const rowPlaceholders = `(${columns.map(() => "?").join(", ")})`;
    await this.database.execute(
      `INSERT INTO "${table}" (${quotedColumns}) VALUES ${rows.map(() => rowPlaceholders).join(", ")} ${conflictClause}`.trim(),
      rows.flat(),
    );
  }

  async getByUid(uid: string): Promise<ProfileContactsData | null> {
    const profile = await this.database.execute(
      "SELECT uid FROM user_profiles WHERE uid = ? LIMIT 1",
      [uid],
    );
    if (profile.length === 0) return null;

    const contactRows = (await this.database.execute(
      "SELECT id, type, platform, value, is_primary AS isPrimary FROM profile_contact_points WHERE uid = ? ORDER BY sort_order",
      [uid],
    )) as ProfileContactPointRow[];
    const locationRows = (await this.database.execute(
      "SELECT id, address, latitude, longitude FROM profile_locations WHERE uid = ? ORDER BY sort_order",
      [uid],
    )) as ProfileLocationRow[];

    return {
      phones: contactRows
        .filter((row) => row.type === "phone")
        .map((row) => ({
          id: publicContactId(uid, "phone", row.id),
          number: row.value,
          type: row.platform || "phone",
        })),
      emails: contactRows
        .filter((row) => row.type === "email")
        .map((row) => ({
          id: publicContactId(uid, "email", row.id),
          email: row.value,
          isPrimary: row.isPrimary,
        })),
      websites: contactRows
        .filter((row) => row.type === "website")
        .map((row) => ({
          id: publicContactId(uid, "website", row.id),
          url: row.value,
        })),
      socialLinks: contactRows
        .filter((row) => row.type === "social")
        .map((row) => ({
          id: publicContactId(uid, "social", row.id),
          platform: row.platform,
          url: row.value,
        })),
      locations: locationRows.map((row) => ({
        id: row.id,
        address: row.address,
        latitude: Number(row.latitude || 0),
        longitude: Number(row.longitude || 0),
      })),
    };
  }

  abstract upsert(uid: string, data: ProfileContactsData): Promise<void>;

  abstract getImageKeys(uid: string): Promise<ProfileImageKeys | null>;

  abstract upsertImageKeys(uid: string, keys: ProfileImageKeys): Promise<void>;

  abstract getStoreDetails(uid: string): Promise<StoreDetailsData | null>;

  abstract upsertStoreDetails(uid: string, details: StoreDetailsData): Promise<void>;

  abstract getFulfillmentSettings(uid: string): Promise<ProfileFulfillmentSettings | null>;

  abstract upsertFulfillmentSettings(uid: string, settings: ProfileFulfillmentSettings): Promise<void>;

  abstract getDeliveryServiceUids(uids: string[]): Promise<string[]>;

  abstract getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection | null>;

  abstract upsertSpecialties(uid: string, selection: ProfileSpecialtiesSelection): Promise<void>;

  abstract getUsersBySpecialty(categoryId: number, subcategoryId: number, offset: number, limit: number, search?: string, minRating?: number): Promise<UserProfileRow[]>;

  protected abstract saveDeliveryCarriers(uid: string, carrierUids: string[]): Promise<void>;

  protected abstract getWorkingHours(uid: string): any;

  protected abstract saveWorkingHours(uid: string, value: StoreDetailsData["workingHours"]): any;

  protected abstract rebuildSearchCategories(uid: string, selection: ProfileSpecialtiesSelection): Promise<void>;

  protected abstract refreshProductCounts(uid: string): Promise<void>;
}
