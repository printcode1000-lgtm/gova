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
  columnForSelection,
  columnForDoctorAppointment,
  deliveryServicesSpecialtyColumn,
} from "../specialty-columns.server";
import { ProfilePart4 } from "./profile-repository.part-04";
import { phoneSearchKey } from "@asol/auth-core";
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

export class ProfilePart5 extends ProfilePart4 {
  protected async getWorkingHours(uid: string) {
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

  protected async saveWorkingHours(
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

  protected async rebuildSearchCategories(
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
          columnForSelection(`${categoryId}:${categoryId}`) ??
          `main_category_${categoryId}`,
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
            columnForSelection(`${categoryId}:${subcategoryId}`) ??
            columnForDoctorAppointment(subcategoryId) ??
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

  protected async refreshProductCounts(uid: string): Promise<void> {
    const rows = (await productsDataSource.execute(
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
