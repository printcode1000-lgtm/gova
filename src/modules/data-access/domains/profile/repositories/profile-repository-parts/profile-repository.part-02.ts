import { productsDataSource, profilesDataSource } from "@/modules/data-access/core";
import "server-only";
import type { IDatabaseClient } from "@/modules/data-access/core/database/database-client.interface";
import type { UserProfileRow } from "@/modules/data-access/core/database/profile/profile.schema";
import type {
  ProfileContactPointRow,
  ProfileDeliveryCarrierRow,
  ProfileImageRow,
  ProfileLocationRow,
  ProfileTrendingItemRow,
  ProfileWorkingHourRow,
} from "@/modules/data-access/core/database/profile/profile.schema";
import type { ProfileContactsData } from "@/features/profile/entities/profile-contacts.entity";
import {
  EMPTY_PROFILE_SHOWCASE,
  EMPTY_STORE_DETAILS,
  type StoreDetailsData,
} from "@/features/profile/entities/store-details.entity";
import type {
  ProfileImageKeys,
  IProfileRepository,
} from "@/modules/data-access/domains/profile/repositories/profile-repository.interface";
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
} from "@/modules/data-access/domains/profile/repositories/specialty-columns.server";
import { ProfilePart1 } from "./profile-repository.part-01";
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

export abstract class ProfilePart2 extends ProfilePart1 {
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
      coverImageKeys,
    };
  }
}
