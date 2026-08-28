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
  specialtyColumnNames,
  selectedSpecialtyColumns,
  columnForDoctorAppointment,
  deliveryServicesSpecialtyColumn,
} from "../specialty-columns.server";
import { ProfilePart3 } from "./profile-repository.part-03";
import { phoneSearchKey } from "@asol/auth-core/phone";
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
  return phoneSearchKey(value);
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

export abstract class ProfilePart4 extends ProfilePart3 {
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
      `SELECT uid FROM user_specialties WHERE uid IN (${placeholders}) AND \`${deliveryServicesSpecialtyColumn()}\` = 1`,
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
    const values = specialtyColumnNames().map((column) =>
      enabled.has(column) ? 1 : 0,
    );
    const quotedColumns = specialtyColumnNames().map(
      (column) => `\`${column}\``,
    ).join(", ");
    const placeholders = specialtyColumnNames().map(() => "?").join(", ");
    const updates = specialtyColumnNames().map(
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

  protected async saveDeliveryCarriers(
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
}
