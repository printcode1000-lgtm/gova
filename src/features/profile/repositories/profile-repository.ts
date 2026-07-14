import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { profileDbClient } from "@/core/database/profile-db-client";
import { productDbClient } from "@/core/database/product-db-client";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import {
  profileContactPoints,
  profileDeliveryCarriers,
  profileFeaturedProducts,
  profileImages,
  profileLocations,
  profileSearchCategories,
  profileTrendingItems,
  profileWorkingHours,
  userProfiles,
} from "@/core/database/profile/profile.schema";
import type { UserProfileRow } from "@/core/database/profile/profile.schema";
import type {
  ProfileContactPointRow,
  ProfileDeliveryCarrierRow,
  ProfileImageRow,
  ProfileLocationRow,
  ProfileSearchCategoryRow,
  ProfileTrendingItemRow,
  ProfileWorkingHourRow,
} from "@/core/database/profile/profile.schema";
import { userSpecialties } from "@/core/database/profile/user-specialties.schema";
import type { ProfileContactsData } from "../entities/profile-contacts.entity";
import {
  EMPTY_PROFILE_SHOWCASE,
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
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
} from "../entities/profile-fulfillment-settings.entity";
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
} from "./specialty-columns.server";

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

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("20") && digits.length === 12 ? digits.slice(2) : digits;
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

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === 1) return value === 1;
  return fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0, next) : fallback;
}

function emptyUserProfile(uid: string): typeof userProfiles.$inferInsert {
  return {
    uid,
    storeName: "",
    storeDescription: "",
    storeStory: "",
    storeNameSearch: "",
    storeDescriptionSearch: "",
    customRequestEnabled: true,
    trendingLabel: EMPTY_PROFILE_SHOWCASE.trending.label,
    primaryPhone: "",
    primaryPhoneNormalized: "",
    primaryWhatsapp: "",
    primaryWhatsappNormalized: "",
    primaryEmail: "",
    primaryAddress: "",
    primaryGovernorate: "",
    primaryCity: "",
    primaryArea: "",
    primaryLatitude: "",
    primaryLongitude: "",
    ratingEnabled: true,
    ratingMode: "stars-comments",
    ratingAverage: 0,
    ratingCount: 0,
    shippingPricingMode: "free",
    shippingFlatRate: 0,
    shippingLocationBaseRate: 0,
    shippingSpecialVehicleFee: 0,
    shippingFreeShippingThreshold: 0,
    shippingNotes: "",
    returnsEnabled: false,
    returnWindowDays: 14,
    returnShippingPayer: "case_by_case",
    returnPolicyText: "",
  };
}

export class ProfileRepository implements IProfileRepository {
  constructor(private database: IDatabaseClient = profileDbClient) {}

  private async ensureProfile(uid: string): Promise<void> {
    const rows = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);
    if (rows.length === 0) {
      await this.database.db.insert(userProfiles).values(emptyUserProfile(uid));
    }
  }

  async getByUid(uid: string): Promise<ProfileContactsData | null> {
    const profile = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);
    if (profile.length === 0) return null;

    const contactRows: ProfileContactPointRow[] = await this.database.db
      .select()
      .from(profileContactPoints)
      .where(eq(profileContactPoints.uid, uid))
      .orderBy(profileContactPoints.sortOrder);
    const locationRows: ProfileLocationRow[] = await this.database.db
      .select()
      .from(profileLocations)
      .where(eq(profileLocations.uid, uid))
      .orderBy(profileLocations.sortOrder);

    return {
      phones: contactRows
        .filter((row) => row.type === "phone")
        .map((row) => ({
          id: row.id,
          number: row.value,
          type: row.platform || "phone",
        })),
      emails: contactRows
        .filter((row) => row.type === "email")
        .map((row) => ({
          id: row.id,
          email: row.value,
          isPrimary: row.isPrimary,
        })),
      websites: contactRows
        .filter((row) => row.type === "website")
        .map((row) => ({ id: row.id, url: row.value })),
      socialLinks: contactRows
        .filter((row) => row.type === "social")
        .map((row) => ({
          id: row.id,
          platform: row.platform,
          url: row.value,
          handle: row.handle,
        })),
      locations: locationRows.map((row) => ({
        id: row.id,
        address: row.address,
        latitude: Number(row.latitude || 0),
        longitude: Number(row.longitude || 0),
      })),
    };
  }

  async upsert(uid: string, data: ProfileContactsData): Promise<void> {
    await this.ensureProfile(uid);
    const timestamp = nowIso();
    await this.database.db
      .delete(profileContactPoints)
      .where(eq(profileContactPoints.uid, uid));
    await this.database.db
      .delete(profileLocations)
      .where(eq(profileLocations.uid, uid));

    const contacts = [
      ...data.phones.map((phone, index) => ({
        id: phone.id || createId("contact"),
        uid,
        type: "phone",
        platform: phone.type || "phone",
        label: phone.type || "phone",
        value: phone.number.trim(),
        normalizedValue: normalizePhone(phone.number),
        handle: "",
        isPrimary: phone.id === "primary-whatsapp" || index === 0,
        isPublic: true,
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...data.emails.map((email, index) => ({
        id: email.id || createId("contact"),
        uid,
        type: "email",
        platform: "",
        label: "email",
        value: email.email.trim(),
        normalizedValue: email.email.trim().toLowerCase(),
        handle: "",
        isPrimary: email.isPrimary || email.id === "primary" || index === 0,
        isPublic: true,
        sortOrder: 100 + index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...data.websites.map((site, index) => ({
        id: site.id || createId("contact"),
        uid,
        type: "website",
        platform: "",
        label: "website",
        value: site.url.trim(),
        normalizedValue: site.url.trim().toLowerCase(),
        handle: "",
        isPrimary: index === 0,
        isPublic: true,
        sortOrder: 200 + index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...data.socialLinks.map((link, index) => ({
        id: link.id || createId("contact"),
        uid,
        type: "social",
        platform: link.platform,
        label: link.platform,
        value: link.url.trim(),
        normalizedValue: link.url.trim().toLowerCase(),
        handle: link.handle,
        isPrimary: false,
        isPublic: true,
        sortOrder: 300 + index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    ].filter((row) => row.value);

    if (contacts.length > 0) {
      await this.database.db.insert(profileContactPoints).values(contacts);
    }

    const locations = data.locations
      .filter((location) => location.address.trim())
      .map((location, index) => ({
        id: location.id || createId("location"),
        uid,
        label: index === 0 ? "primary" : "",
        address: location.address.trim(),
        governorate: "",
        city: "",
        area: "",
        latitude: String(location.latitude || ""),
        longitude: String(location.longitude || ""),
        isPrimary: index === 0,
        isPublic: true,
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
    if (locations.length > 0) {
      await this.database.db.insert(profileLocations).values(locations);
    }

    const primaryPhone = data.phones[0]?.number.trim() ?? "";
    const primaryWhatsapp =
      data.phones.find((phone) => phone.type === "whatsapp")?.number.trim() ??
      primaryPhone;
    const primaryEmail =
      data.emails.find((email) => email.isPrimary)?.email.trim() ??
      data.emails[0]?.email.trim() ??
      "";
    const primaryLocation = locations[0];
    await this.database.db
      .update(userProfiles)
      .set({
        primaryPhone,
        primaryPhoneNormalized: normalizePhone(primaryPhone),
        primaryWhatsapp,
        primaryWhatsappNormalized: normalizePhone(primaryWhatsapp),
        primaryEmail,
        primaryAddress: primaryLocation?.address ?? "",
        primaryLatitude: primaryLocation?.latitude ?? "",
        primaryLongitude: primaryLocation?.longitude ?? "",
      })
      .where(eq(userProfiles.uid, uid));
  }

  async getImageKeys(uid: string): Promise<ProfileImageKeys | null> {
    const rows: ProfileImageRow[] = await this.database.db
      .select()
      .from(profileImages)
      .where(eq(profileImages.uid, uid))
      .orderBy(profileImages.sortOrder);
    const avatar = rows.find((row) => row.imageType === "avatar")?.imageKey ?? null;
    const coverImageKeys = rows
      .filter((row) => row.imageType === "cover")
      .map((row) => row.imageKey);
    if (!avatar && coverImageKeys.length === 0) return null;
    return {
      avatarImageKey: avatar,
      coverImageKey: coverImageKeys[0] ?? null,
      coverImageKeys,
    };
  }

  async upsertImageKeys(uid: string, keys: ProfileImageKeys): Promise<void> {
    await this.ensureProfile(uid);
    const timestamp = nowIso();
    await this.database.db.delete(profileImages).where(eq(profileImages.uid, uid));
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
      ...keys.coverImageKeys.slice(0, 3).map((imageKey, index) => ({
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
    if (rows.length > 0) await this.database.db.insert(profileImages).values(rows);
  }

  async getStoreDetails(uid: string): Promise<StoreDetailsData | null> {
    const rows = await this.database.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    const featured: Array<typeof profileFeaturedProducts.$inferSelect> = await this.database.db
      .select()
      .from(profileFeaturedProducts)
      .where(eq(profileFeaturedProducts.uid, uid))
      .orderBy(profileFeaturedProducts.sortOrder);
    const trending: ProfileTrendingItemRow[] = await this.database.db
      .select()
      .from(profileTrendingItems)
      .where(eq(profileTrendingItems.uid, uid))
      .orderBy(profileTrendingItems.sortOrder);
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

  async upsertStoreDetails(uid: string, details: StoreDetailsData): Promise<void> {
    await this.ensureProfile(uid);
    const timestamp = nowIso();
    const normalizedWorkingHours = normalizeProfileWorkingHours(details.workingHours);
    await this.database.db
      .update(userProfiles)
      .set({
        storeName: details.storeName.trim(),
        storeDescription: details.storeDescription.trim(),
        storeStory: details.storeStory.trim(),
        storeNameSearch: normalizeSearchText(details.storeName),
        storeDescriptionSearch: normalizeSearchText(details.storeDescription),
        customRequestEnabled: details.profileShowcase.customRequestEnabled,
        trendingLabel:
          details.profileShowcase.trending.label.trim() ||
          EMPTY_PROFILE_SHOWCASE.trending.label,
        ratingEnabled: details.ratingSettings.enabled,
        ratingMode: details.ratingSettings.mode,
      })
      .where(eq(userProfiles.uid, uid));

    await this.database.db
      .delete(profileFeaturedProducts)
      .where(eq(profileFeaturedProducts.uid, uid));
    const featured = Array.from(new Set(details.profileShowcase.featuredProductIds))
      .filter(Boolean)
      .slice(0, 20)
      .map((productId, index) => ({
        uid,
        productId,
        sortOrder: index,
        createdAt: timestamp,
      }));
    if (featured.length > 0) {
      await this.database.db.insert(profileFeaturedProducts).values(featured);
    }

    await this.database.db
      .delete(profileTrendingItems)
      .where(eq(profileTrendingItems.uid, uid));
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
    if (trending.length > 0) {
      await this.database.db.insert(profileTrendingItems).values(trending);
    }

    await this.saveWorkingHours(uid, normalizedWorkingHours);
  }

  async getFulfillmentSettings(uid: string): Promise<ProfileFulfillmentSettings | null> {
    const rows = await this.database.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    const carriers: ProfileDeliveryCarrierRow[] = await this.database.db
      .select()
      .from(profileDeliveryCarriers)
      .where(eq(profileDeliveryCarriers.sellerUid, uid))
      .orderBy(profileDeliveryCarriers.priority);
    return {
      selfDeliveryEnabled: false,
      carrierUids: carriers.map((carrier) => carrier.carrierUid),
      shippingPricing: {
        mode:
          row.shippingPricingMode === "flat" ||
          row.shippingPricingMode === "by_location" ||
          row.shippingPricingMode === "free"
            ? row.shippingPricingMode
            : "free",
        flatRate: row.shippingFlatRate,
        locationBaseRate: row.shippingLocationBaseRate,
        specialVehicleFee: row.shippingSpecialVehicleFee,
        freeShippingThreshold: row.shippingFreeShippingThreshold,
        notes: row.shippingNotes,
      },
      returns: {
        enabled: row.returnsEnabled,
        returnWindowDays: row.returnWindowDays,
        policyText: row.returnPolicyText,
        returnShippingPayer:
          row.returnShippingPayer === "buyer" ||
          row.returnShippingPayer === "seller" ||
          row.returnShippingPayer === "case_by_case"
            ? row.returnShippingPayer
            : "case_by_case",
      },
    };
  }

  async upsertFulfillmentSettings(
    uid: string,
    settings: ProfileFulfillmentSettings,
  ): Promise<void> {
    await this.ensureProfile(uid);
    await this.database.db
      .update(userProfiles)
      .set({
        shippingPricingMode: settings.shippingPricing.mode,
        shippingFlatRate: settings.shippingPricing.flatRate,
        shippingLocationBaseRate: settings.shippingPricing.locationBaseRate,
        shippingSpecialVehicleFee: settings.shippingPricing.specialVehicleFee,
        shippingFreeShippingThreshold: settings.shippingPricing.freeShippingThreshold,
        shippingNotes: settings.shippingPricing.notes,
        returnsEnabled: settings.returns.enabled,
        returnWindowDays: settings.returns.returnWindowDays,
        returnShippingPayer: settings.returns.returnShippingPayer,
        returnPolicyText: settings.returns.policyText,
      })
      .where(eq(userProfiles.uid, uid));
    await this.saveDeliveryCarriers(uid, settings.carrierUids);
  }

  async getDeliveryServiceUids(uids: string[]): Promise<string[]> {
    const uniqueUids = Array.from(new Set(uids)).filter(Boolean);
    if (uniqueUids.length === 0) return [];
    const rows: ProfileSearchCategoryRow[] = await this.database.db
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

  async getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection | null> {
    const rows: ProfileSearchCategoryRow[] = await this.database.db
      .select()
      .from(profileSearchCategories)
      .where(eq(profileSearchCategories.uid, uid));
    if (rows.length === 0) return EMPTY_PROFILE_SPECIALTIES;

    const main = rows
      .filter((row) => row.source === "main")
      .map((row) => row.categoryId);
    const sub: Record<string, number[]> = {};
    rows
      .filter((row) => row.source !== "main")
      .forEach((row) => {
        const key = String(row.categoryId);
        sub[key] = [...(sub[key] ?? []), row.subcategoryId];
      });
    return { main: Array.from(new Set(main)), sub };
  }

  async upsertSpecialties(
    uid: string,
    selection: ProfileSpecialtiesSelection,
  ): Promise<void> {
    await this.ensureProfile(uid);
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
    await this.rebuildSearchCategories(uid, selection);
    await this.refreshProductCounts(uid);
  }

  async getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ): Promise<UserProfileRow[]> {
    const params: Array<string | number> = [categoryId, subcategoryId];
    const where = [
      "c.category_id = ?",
      "c.subcategory_id = ?",
      "c.is_enabled = 1",
    ];
    const searchText = normalizeSearchText(search ?? "");
    if (searchText) {
      where.push(
        "(p.store_name_search LIKE ? OR p.store_description_search LIKE ? OR p.primary_phone_normalized LIKE ? OR p.uid LIKE ?)",
      );
      const phone = normalizePhone(searchText);
      params.push(`%${searchText}%`, `%${searchText}%`, `%${phone}%`, `%${searchText}%`);
    }
    if (typeof minRating === "number" && Number.isFinite(minRating) && minRating >= 1) {
      where.push("p.rating_average >= ?");
      params.push(minRating * 100);
    }
    params.push(Math.max(1, limit), Math.max(0, offset));
    return (await this.database.execute(
      `SELECT DISTINCT p.*
       FROM profile_search_categories c
       INNER JOIN user_profiles p ON p.uid = c.uid
       WHERE ${where.join(" AND ")}
       ORDER BY p.store_name COLLATE NOCASE ASC, p.uid ASC
       LIMIT ? OFFSET ?`,
      params,
    )) as UserProfileRow[];
  }

  private async saveDeliveryCarriers(uid: string, carrierUids: string[]): Promise<void> {
    const timestamp = nowIso();
    await this.database.db
      .delete(profileDeliveryCarriers)
      .where(eq(profileDeliveryCarriers.sellerUid, uid));
    const rows = Array.from(new Set(carrierUids.filter(Boolean))).map(
      (carrierUid, index) => ({
        sellerUid: uid,
        carrierUid,
        isDefault: index === 0,
        priority: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
    if (rows.length > 0) await this.database.db.insert(profileDeliveryCarriers).values(rows);
  }

  private async getWorkingHours(uid: string) {
    const rows: ProfileWorkingHourRow[] = await this.database.db
      .select()
      .from(profileWorkingHours)
      .where(eq(profileWorkingHours.uid, uid))
      .orderBy(profileWorkingHours.dayOfWeek, profileWorkingHours.periodIndex);
    if (rows.length === 0) return EMPTY_PROFILE_WORKING_HOURS;
    const days = WORKING_DAY_LABELS.map((day, dayIndex) => {
      const periods = rows
        .filter((row) => row.dayOfWeek === dayIndex && row.isOpen)
        .map((row) => ({
          id: row.id,
          start: row.openTime,
          end: row.closeTime,
        }));
      return { day: day.id, open: periods.length > 0, periods };
    });
    return normalizeProfileWorkingHours({
      timezone: EMPTY_PROFILE_WORKING_HOURS.timezone,
      note: rows.find((row) => row.note)?.note ?? "",
      days,
    });
  }

  private async saveWorkingHours(uid: string, value: StoreDetailsData["workingHours"]) {
    const timestamp = nowIso();
    await this.database.db
      .delete(profileWorkingHours)
      .where(eq(profileWorkingHours.uid, uid));
    const rows = value.days.flatMap((day) => {
      const dayIndex = DAY_TO_INDEX.get(day.day) ?? 0;
      if (!day.open || day.periods.length === 0) {
        return [
          {
            id: createId("hours"),
            uid,
            dayOfWeek: dayIndex,
            periodIndex: 0,
            isOpen: false,
            openTime: "",
            closeTime: "",
            note: value.note,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ];
      }
      return day.periods.map((period, index) => ({
        id: period.id || createId("hours"),
        uid,
        dayOfWeek: dayIndex,
        periodIndex: index,
        isOpen: true,
        openTime: period.start,
        closeTime: period.end,
        note: index === 0 ? value.note : "",
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
    });
    if (rows.length > 0) await this.database.db.insert(profileWorkingHours).values(rows);
  }

  private async rebuildSearchCategories(
    uid: string,
    selection: ProfileSpecialtiesSelection,
  ): Promise<void> {
    const timestamp = nowIso();
    await this.database.db
      .delete(profileSearchCategories)
      .where(eq(profileSearchCategories.uid, uid));
    const rows = [
      ...selection.main.map((categoryId) => ({
        uid,
        categoryId,
        subcategoryId: categoryId,
        specialtyColumn:
          categoryId === 46
            ? "delivery_services_46"
            : (columnBySelection.get(`${categoryId}:${categoryId}`) ?? ""),
        source: "main",
        isEnabled: true,
        updatedAt: timestamp,
      })),
      ...Object.entries(selection.sub).flatMap(([categoryId, ids]) =>
        ids.map((subcategoryId) => ({
          uid,
          categoryId: Number(categoryId),
          subcategoryId,
          specialtyColumn:
            columnBySelection.get(`${categoryId}:${subcategoryId}`) ??
            columnByDoctorAppointment.get(subcategoryId) ??
            "",
          source: "profile",
          isEnabled: true,
          updatedAt: timestamp,
        })),
      ),
    ].filter((row) => row.specialtyColumn);
    if (rows.length > 0) {
      await this.database.db.insert(profileSearchCategories).values(rows);
    }
  }

  private async refreshProductCounts(uid: string): Promise<void> {
    const rows = (await productDbClient.execute(
      `SELECT main_category_id category_id,
              subcategory_id subcategory_id,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) active_count,
              SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) draft_count,
              SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) archived_count
       FROM products
       WHERE uid = ?
         AND COALESCE(pharmacy_catalog_kind, '') != 'fixed'
       GROUP BY main_category_id, subcategory_id`,
      [uid],
    )) as Array<{
      category_id: string;
      subcategory_id: string;
      active_count: number;
      draft_count: number;
      archived_count: number;
    }>;
    await this.database.execute(
      "DELETE FROM profile_category_product_counts WHERE uid = ?",
      [uid],
    );
    const timestamp = nowIso();
    for (const row of rows) {
      await this.database.execute(
        `INSERT INTO profile_category_product_counts
          (uid, category_id, subcategory_id, active_product_count, draft_product_count, archived_product_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          row.category_id,
          row.subcategory_id,
          Number(row.active_count ?? 0),
          Number(row.draft_count ?? 0),
          Number(row.archived_count ?? 0),
          timestamp,
        ],
      );
    }
  }
}

export const profileRepository = new ProfileRepository();
