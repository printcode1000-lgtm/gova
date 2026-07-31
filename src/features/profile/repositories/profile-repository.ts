import "server-only";

import { profileDbClient } from "@/core/database/profile-db-client";
import { productDbClient } from "@/core/database/product-db-client";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import type { UserProfileRow } from "@/core/database/profile/profile.schema";
import type {
  ProfileContactPointRow,
  ProfileDeliveryCarrierRow,
  ProfileImageRow,
  ProfileLocationRow,
  ProfileTrendingItemRow,
  ProfileWorkingHourRow,
} from "@/core/database/profile/profile.schema";
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

export class ProfileRepository implements IProfileRepository {
  constructor(private database: IDatabaseClient = profileDbClient) {}

  private async ensureProfile(uid: string): Promise<void> {
    await this.database.execute(
      "INSERT INTO user_profiles (uid) VALUES (?) ON CONFLICT(uid) DO NOTHING",
      [uid],
    );
  }

  private async insertRows(
    table: string,
    columns: string[],
    rows: unknown[][],
  ): Promise<void> {
    if (rows.length === 0) return;
    const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
    const rowPlaceholders = `(${columns.map(() => "?").join(", ")})`;
    await this.database.execute(
      `INSERT INTO "${table}" (${quotedColumns}) VALUES ${rows.map(() => rowPlaceholders).join(", ")}`,
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

  async upsert(uid: string, data: ProfileContactsData): Promise<void> {
    await this.ensureProfile(uid);
    const timestamp = nowIso();
    await this.database.execute(
      "DELETE FROM profile_contact_points WHERE uid = ?",
      [uid],
    );
    await this.database.execute("DELETE FROM profile_locations WHERE uid = ?", [
      uid,
    ]);

    const contacts = [
      ...data.phones.map((phone, index) => ({
        id: scopedContactId(uid, "phone", phone.id || createId("contact")),
        uid,
        type: "phone",
        platform: phone.type || "phone",
        label: phone.type || "phone",
        value: phone.number.trim(),
        normalizedValue: normalizePhone(phone.number),
        isPrimary: phone.id === "primary-whatsapp" || index === 0,
        isPublic: true,
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...data.emails.map((email, index) => ({
        id: scopedContactId(uid, "email", email.id || createId("contact")),
        uid,
        type: "email",
        platform: "",
        label: "email",
        value: email.email.trim(),
        normalizedValue: email.email.trim().toLowerCase(),
        isPrimary: email.isPrimary || email.id === "primary" || index === 0,
        isPublic: true,
        sortOrder: 100 + index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...data.websites.map((site, index) => ({
        id: scopedContactId(uid, "website", site.id || createId("contact")),
        uid,
        type: "website",
        platform: "",
        label: "website",
        value: site.url.trim(),
        normalizedValue: site.url.trim().toLowerCase(),
        isPrimary: index === 0,
        isPublic: true,
        sortOrder: 200 + index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...data.socialLinks.map((link, index) => ({
        id: scopedContactId(uid, "social", link.id || createId("contact")),
        uid,
        type: "social",
        platform: link.platform,
        label: link.platform,
        value: link.url.trim(),
        normalizedValue: link.url.trim().toLowerCase(),
        isPrimary: false,
        isPublic: true,
        sortOrder: 300 + index,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    ].filter((row) => row.value);

    await this.insertRows(
      "profile_contact_points",
      [
        "id",
        "uid",
        "type",
        "platform",
        "label",
        "value",
        "normalized_value",
        "is_primary",
        "is_public",
        "sort_order",
        "created_at",
        "updated_at",
      ],
      contacts.map((row) => [
        row.id,
        row.uid,
        row.type,
        row.platform,
        row.label,
        row.value,
        row.normalizedValue,
        row.isPrimary,
        row.isPublic,
        row.sortOrder,
        row.createdAt,
        row.updatedAt,
      ]),
    );

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
    await this.insertRows(
      "profile_locations",
      [
        "id",
        "uid",
        "label",
        "address",
        "governorate",
        "city",
        "area",
        "latitude",
        "longitude",
        "is_primary",
        "is_public",
        "sort_order",
        "created_at",
        "updated_at",
      ],
      locations.map((row) => [
        row.id,
        row.uid,
        row.label,
        row.address,
        row.governorate,
        row.city,
        row.area,
        row.latitude,
        row.longitude,
        row.isPrimary,
        row.isPublic,
        row.sortOrder,
        row.createdAt,
        row.updatedAt,
      ]),
    );

    const primaryPhone = data.phones[0]?.number.trim() ?? "";
    const primaryWhatsapp =
      data.phones.find((phone) => phone.type === "whatsapp")?.number.trim() ??
      primaryPhone;
    const primaryEmail =
      data.emails.find((email) => email.isPrimary)?.email.trim() ??
      data.emails[0]?.email.trim() ??
      "";
    const primaryLocation = locations[0];
    await this.database.update(
      "user_profiles",
      {
        primary_phone: primaryPhone,
        primary_phone_normalized: normalizePhone(primaryPhone),
        primary_whatsapp: primaryWhatsapp,
        primary_whatsapp_normalized: normalizePhone(primaryWhatsapp),
        primary_email: primaryEmail,
        primary_address: primaryLocation?.address ?? "",
        primary_latitude: primaryLocation?.latitude ?? "",
        primary_longitude: primaryLocation?.longitude ?? "",
      },
      { uid },
    );
  }

  async getImageKeys(uid: string): Promise<ProfileImageKeys | null> {
    const rows = (await this.database.execute(
      "SELECT image_key AS imageKey, image_type AS imageType FROM profile_images WHERE uid = ? ORDER BY sort_order",
      [uid],
    )) as ProfileImageRow[];
    const avatar =
      rows.find((row) => row.imageType === "avatar")?.imageKey ?? null;
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

  async getFulfillmentSettings(
    uid: string,
  ): Promise<ProfileFulfillmentSettings | null> {
    const rows = await this.database.execute(
      `SELECT shipping_pricing_mode AS shippingPricingMode, shipping_flat_rate AS shippingFlatRate, shipping_special_vehicle_fee AS shippingSpecialVehicleFee, shipping_free_shipping_threshold AS shippingFreeShippingThreshold, shipping_notes AS shippingNotes, returns_enabled AS returnsEnabled, return_window_days AS returnWindowDays, return_policy_text AS returnPolicyText, return_shipping_payer AS returnShippingPayer FROM user_profiles WHERE uid = ? LIMIT 1`,
      [uid],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    const carriers = (await this.database.execute(
      "SELECT carrier_uid AS carrierUid FROM profile_delivery_carriers WHERE seller_uid = ? ORDER BY priority",
      [uid],
    )) as ProfileDeliveryCarrierRow[];
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
    await this.database.update(
      "user_profiles",
      {
        shipping_pricing_mode: settings.shippingPricing.mode,
        shipping_flat_rate: settings.shippingPricing.flatRate,
        // Location-based shipping is negotiated through a buyer-approved quote.
        shipping_location_base_rate: 0,
        shipping_special_vehicle_fee:
          settings.shippingPricing.specialVehicleFee,
        shipping_free_shipping_threshold:
          settings.shippingPricing.freeShippingThreshold,
        shipping_notes: settings.shippingPricing.notes,
        returns_enabled: settings.returns.enabled,
        return_window_days: settings.returns.returnWindowDays,
        return_shipping_payer: settings.returns.returnShippingPayer,
        return_policy_text: settings.returns.policyText,
      },
      { uid },
    );
    await this.saveDeliveryCarriers(uid, settings.carrierUids);
  }

  async getDeliveryServiceUids(uids: string[]): Promise<string[]> {
    const uniqueUids = Array.from(new Set(uids)).filter(Boolean);
    if (uniqueUids.length === 0) return [];
    const placeholders = uniqueUids.map(() => "?").join(", ");
    const rows = (await this.database.execute(
      `SELECT uid FROM user_specialties WHERE uid IN (${placeholders}) AND delivery_services_46 = 1`,
      uniqueUids,
    )) as Array<{ uid: string }>;
    return rows.map((row: { uid: string }) => row.uid);
  }

  async getSpecialties(
    uid: string,
  ): Promise<ProfileSpecialtiesSelection | null> {
    const rows = (await this.database.execute(
      `SELECT category_id, subcategory_id, source
       FROM profile_search_categories
       WHERE uid = ?`,
      [uid],
    )) as Array<{
      category_id: number | string;
      subcategory_id: number | string;
      source: string;
    }>;
    if (rows.length === 0) return EMPTY_PROFILE_SPECIALTIES;

    const main = rows
      .filter((row) => row.source === "main")
      .map((row) => Number(row.category_id));
    const sub: Record<string, number[]> = {};
    rows
      .filter((row) => row.source !== "main")
      .forEach((row) => {
        const key = String(row.category_id);
        sub[key] = [...(sub[key] ?? []), Number(row.subcategory_id)];
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
    const searchText = normalizeSearchText(search ?? "");
    const categoryRows = (await this.database.execute(
      `SELECT DISTINCT uid FROM profile_search_categories c
       WHERE c.category_id = ? AND c.subcategory_id = ? AND c.is_enabled = 1`,
      [categoryId, subcategoryId],
    )) as Array<{ uid: string }>;
    const uids = categoryRows.map((row) => row.uid).filter(Boolean);
    if (uids.length === 0) return [];
    const uidPlaceholders = uids.map(() => "?").join(",");
    const profileParams: Array<string | number> = [...uids];
    const profileWhere = [`p.uid IN (${uidPlaceholders})`];
    if (searchText) {
      profileWhere.push(
        "(p.store_name_search LIKE ? OR p.store_description_search LIKE ? OR p.primary_phone_normalized LIKE ? OR p.uid LIKE ?)",
      );
      const phone = normalizePhone(searchText);
      profileParams.push(
        `%${searchText}%`,
        `%${searchText}%`,
        `%${phone}%`,
        `%${searchText}%`,
      );
    }
    if (
      typeof minRating === "number" &&
      Number.isFinite(minRating) &&
      minRating >= 1
    ) {
      profileWhere.push("p.rating_average >= ?");
      profileParams.push(minRating * 100);
    }
    profileParams.push(Math.max(1, limit), Math.max(0, offset));
    return (await this.database.execute(
      `SELECT p.*
       FROM user_profiles p
       WHERE ${profileWhere.join(" AND ")}
       ORDER BY p.store_name COLLATE NOCASE ASC, p.uid ASC
       LIMIT ? OFFSET ?`,
      profileParams,
    )) as UserProfileRow[];
  }

  private async saveDeliveryCarriers(
    uid: string,
    carrierUids: string[],
  ): Promise<void> {
    const timestamp = nowIso();
    await this.database.execute(
      "DELETE FROM profile_delivery_carriers WHERE seller_uid = ?",
      [uid],
    );
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
    await this.insertRows(
      "profile_delivery_carriers",
      [
        "seller_uid",
        "carrier_uid",
        "is_default",
        "priority",
        "created_at",
        "updated_at",
      ],
      rows.map((row) => [
        row.sellerUid,
        row.carrierUid,
        row.isDefault,
        row.priority,
        row.createdAt,
        row.updatedAt,
      ]),
    );
  }

  private async getWorkingHours(uid: string) {
    const rows = (await this.database.execute(
      `SELECT id,
              day_of_week AS dayOfWeek,
              is_open AS isOpen,
              open_time AS openTime,
              close_time AS closeTime,
              note
       FROM profile_working_hours
       WHERE uid = ?
       ORDER BY day_of_week, period_index`,
      [uid],
    )) as ProfileWorkingHourRow[];
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

  private async saveWorkingHours(
    uid: string,
    value: StoreDetailsData["workingHours"],
  ) {
    const timestamp = nowIso();
    await this.database.execute(
      "DELETE FROM profile_working_hours WHERE uid = ?",
      [uid],
    );
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
    await this.insertRows(
      "profile_working_hours",
      [
        "id",
        "uid",
        "day_of_week",
        "period_index",
        "is_open",
        "open_time",
        "close_time",
        "note",
        "created_at",
        "updated_at",
      ],
      rows.map((row) => [
        row.id,
        row.uid,
        row.dayOfWeek,
        row.periodIndex,
        row.isOpen,
        row.openTime,
        row.closeTime,
        row.note,
        row.createdAt,
        row.updatedAt,
      ]),
    );
  }

  private async rebuildSearchCategories(
    uid: string,
    selection: ProfileSpecialtiesSelection,
  ): Promise<void> {
    const timestamp = nowIso();
    await this.database.execute(
      "DELETE FROM profile_search_categories WHERE uid = ?",
      [uid],
    );
    const rows = [
      ...selection.main.map((categoryId) => ({
        uid,
        categoryId,
        subcategoryId: categoryId,
        specialtyColumn:
          categoryId === 46
            ? "delivery_services_46"
            : (columnBySelection.get(`${categoryId}:${categoryId}`) ??
              `main_category_${categoryId}`),
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
    await this.insertRows(
      "profile_search_categories",
      [
        "uid",
        "category_id",
        "subcategory_id",
        "specialty_column",
        "source",
        "is_enabled",
        "updated_at",
      ],
      rows.map((row) => [
        row.uid,
        row.categoryId,
        row.subcategoryId,
        row.specialtyColumn,
        row.source,
        row.isEnabled,
        row.updatedAt,
      ]),
    );
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
