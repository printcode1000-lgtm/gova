import "server-only";

import { eq, or, and, inArray } from "drizzle-orm";
import { profileDbClient } from "@/core/database/profile-db-client";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import { userProfiles } from "@/core/database/profile/profile.schema";
import type { UserProfileRow } from "@/core/database/profile/profile.schema";
import { userSpecialties } from "@/core/database/profile/user-specialties.schema";
import type { ProfileContactsData } from "../entities/profile-contacts.entity";
import {
  EMPTY_STORE_DETAILS,
  type StoreDetailsData,
} from "../entities/store-details.entity";
import type {
  ProfileImageKeys,
  IProfileRepository,
} from "./profile-repository.interface";
import {
  EMPTY_PROFILE_SPECIALTIES,
  type ProfileSpecialtiesSelection,
} from "../entities/profile-specialties.entity";
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

function rowToContacts(
  row: typeof userProfiles.$inferSelect,
): ProfileContactsData {
  return {
    phones: parseJson(row.phonesJson, []),
    emails: parseJson(row.emailsJson, []),
    websites: parseJson(row.websitesJson, []),
    socialLinks: parseJson(row.socialLinksJson, []),
    locations: parseJson<ProfileContactsData['locations']>(row.locationJson ?? '[]', []),
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
  };
}

function rowToStoreDetails(row: {
  storeDetailsJson: string;
}): StoreDetailsData {
  return normalizeStoreDetails(
    parseJson(row.storeDetailsJson, EMPTY_STORE_DETAILS),
  );
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
      .select()
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
    const rows = await this.database.db
      .select({ storeDetailsJson: userProfiles.storeDetailsJson })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (rows.length === 0) return null;
    return rowToStoreDetails(rows[0]);
  }

  async upsertStoreDetails(
    uid: string,
    details: StoreDetailsData,
  ): Promise<void> {
    const payload = {
      storeDetailsJson: JSON.stringify(details),
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
  ): Promise<UserProfileRow[]> {
    // Try doctor-appointment mapping first (for medical specialties), then regular subcategories
    const columnName = columnByDoctorAppointment.get(subcategoryId) ||
                      columnBySelection.get(`${categoryId}:${subcategoryId}`) ||
                      columnBySelection.get(`${categoryId}:${categoryId}`);
    
    if (!columnName) return [];

    // Build OR condition: search in specific column OR parent collection member column
    const conditions = [
      eq(userSpecialties[columnName as keyof typeof userSpecialties] as any, 1),
    ];
    
    // If this is a subcategory, also search in the parent collection member column
    if (categoryId !== 46) { // 46 is delivery services, handled separately
      const parentColumn = columnBySelection.get(`${categoryId}:${categoryId}`);
      if (parentColumn) {
        conditions.push(eq(userSpecialties[parentColumn as keyof typeof userSpecialties] as any, 1));
      }
    }
    
    const specialtyRows = await this.database.db
      .select({ uid: userSpecialties.uid })
      .from(userSpecialties)
      .where(or(...conditions))
      .limit(limit)
      .offset(offset);

    if (specialtyRows.length === 0) return [];

    const uids = specialtyRows.map((row: { uid: string }) => row.uid);

    // Fetch all profiles for the found UIDs
    const profiles = await this.database.db
      .select()
      .from(userProfiles)
      .where(inArray(userProfiles.uid, uids));

    return profiles as UserProfileRow[];
  }
}

export const profileRepository = new ProfileRepository();
