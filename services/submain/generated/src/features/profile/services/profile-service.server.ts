import "server-only";

import type { GetProfileContactsQuery } from "@asol/data-core/profile";
import type { UpsertProfileContactsCommand } from "@asol/data-core/profile";
import type { GetProfileImageKeysQuery } from "@asol/data-core/profile";
import type { UpsertProfileImageKeysCommand } from "@asol/data-core/profile";
import type { GetStoreDetailsQuery } from "@asol/data-core/profile";
import type { UpsertStoreDetailsCommand } from "@asol/data-core/profile";
import type { GetProfileSpecialtiesQuery } from "@asol/data-core/profile";
import type { UpsertProfileSpecialtiesCommand } from "@asol/data-core/profile";
import type { GetUsersBySpecialtyQuery } from "@asol/data-core/profile";
import type { GetProfileFulfillmentSettingsQuery } from "@asol/data-core/profile";
import type { UpsertProfileFulfillmentSettingsCommand } from "@asol/data-core/profile";
import type { GetUserByUidQuery } from "@asol/data-core/auth";
import { authOperationsService } from "@/features/auth/server/auth-core-bootstrap.server";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import type {
  ProfileContactsData,
  SaveProfileContactsInput,
} from "../entities/profile-contacts.entity";
import type {
  SaveStoreImagesInput,
  StoreImagesData,
} from "../entities/store-images.entity";
import type {
  SaveStoreDetailsInput,
  StoreDetailsData,
} from "../entities/store-details.entity";
import type { IProfileService } from "./profile-service.interface";
import type {
  SaveProfileEditorInput,
  SaveProfileEditorResult,
} from "../entities/profile-editor.entity";
import type {
  ProfileSpecialtiesSelection,
  SaveProfileSpecialtiesInput,
} from "../entities/profile-specialties.entity";
import type {
  ProfileFulfillmentSettings,
  SaveProfileFulfillmentSettingsInput,
} from "../entities/profile-fulfillment-settings.entity";
import { traceServerLayer } from "@/core/monitor/trace-server-layer";
import { StorageProfiles } from "@asol/storage-core";
import { imageStorageOrchestrator } from "@asol/storage-core/server";
import { categoryService, CATEGORY_CONSTANTS } from "@/features/categories";

const AVATAR_PROFILE_ID = StorageProfiles.Avatar;
const COVER_PROFILE_ID = StorageProfiles.Cover;
const MAX_COVER_IMAGES = 3;
const PRIMARY_PHONE_ID = "primary-whatsapp";
const PRIMARY_EMAIL_ID = "primary";

function comparablePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function assertBrowserMergedContacts(
  registration: { phone: string; email?: string | null },
  contacts: ProfileContactsData,
): void {
  const phone = comparablePhone(registration.phone);
  const primaryPhones = contacts.phones.filter(
    (item) => item.id === PRIMARY_PHONE_ID,
  );
  const duplicatedPhone = contacts.phones.some(
    (item) =>
      item.id !== PRIMARY_PHONE_ID && comparablePhone(item.number) === phone,
  );
  if (
    primaryPhones.length !== 1 ||
    comparablePhone(primaryPhones[0].number) !== phone ||
    primaryPhones[0].type !== "whatsapp" ||
    duplicatedPhone
  ) {
    throw new Error("invalidProfileContacts");
  }

  const email = registration.email?.trim().toLowerCase() ?? "";
  const primaryEmails = contacts.emails.filter(
    (item) => item.id === PRIMARY_EMAIL_ID,
  );
  const duplicatedEmail = contacts.emails.some(
    (item) =>
      item.id !== PRIMARY_EMAIL_ID &&
      Boolean(email) &&
      item.email.trim().toLowerCase() === email,
  );
  const hasValidPrimaryEmail = email
    ? primaryEmails.length === 1 &&
      primaryEmails[0].email.trim().toLowerCase() === email &&
      primaryEmails[0].isPrimary
    : primaryEmails.length === 0;

  if (!hasValidPrimaryEmail || duplicatedEmail) {
    throw new Error("invalidProfileContacts");
  }
}

function normalizeCoverImageKeys(keys: string[]): string[] {
  return Array.from(
    new Set(
      keys
        .filter((key): key is string => typeof key === "string")
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_COVER_IMAGES);
}

function isIntegerId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function selectableProfileSubcategoryIds(categoryId: number): Set<number> {
  const category = categoryService
    .getProfileMainOptions()
    .find((item) => item.id === categoryId);
  if (!category) return new Set();

  const ids = categoryService
    .getProfileSubOptions(category.id, category.isCollection)
    .filter(
      (item) => !item.isDoctorAppointmentGroup && item.selectable !== false,
    )
    .map((item) => item.originalId ?? item.id)
    .filter(isIntegerId);

  if (category.id === CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID) {
    ids.push(
      ...categoryService
        .getDoctorAppointmentItems()
        .map((item) => item.originalId ?? item.id)
        .filter(isIntegerId),
    );
  }

  return new Set(ids);
}

function normalizeSpecialties(
  value: ProfileSpecialtiesSelection,
  options: { unlimited?: boolean } = {},
): ProfileSpecialtiesSelection {
  const mainCandidates = Array.from(
    new Set(
      (Array.isArray(value?.main) ? value.main : []).filter(Number.isInteger),
    ),
  );
  const validMain = mainCandidates.filter((categoryId) => {
    if (categoryId === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID) return true;
    return categoryService
      .getProfileMainOptions()
      .some((item) => item.id === categoryId);
  });
  const sub: Record<string, number[]> = {};
  if (value?.sub && typeof value.sub === "object") {
    for (const [categoryId, ids] of Object.entries(value.sub)) {
      if (!/^\d+$/.test(categoryId) || !Array.isArray(ids)) continue;
      const numericCategoryId = Number(categoryId);
      if (!validMain.includes(numericCategoryId)) continue;
      const allowedIds = selectableProfileSubcategoryIds(numericCategoryId);
      const normalized = Array.from(
        new Set(ids.filter(Number.isInteger)),
      ).filter((id) => {
        if (allowedIds.has(id)) return true;
        return categoryService.resolveProductSelection(
          categoryId,
          String(id),
        ).valid;
      });
      if (normalized.length > 0) sub[categoryId] = normalized;
    }
  }

  const pairedMain = validMain.filter((categoryId) => {
    if (categoryId === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID) return true;
    const selectableIds = selectableProfileSubcategoryIds(categoryId);
    return (
      selectableIds.size === 0 || (sub[String(categoryId)]?.length ?? 0) > 0
    );
  });

  const main = options.unlimited ? pairedMain : pairedMain.slice(0, 3);
  const allowedMain = new Set(main.map(String));
  const pairedSub = Object.fromEntries(
    Object.entries(sub).filter(([categoryId]) => allowedMain.has(categoryId)),
  );

  return { main, sub: pairedSub };
}

export class ProfileService implements IProfileService {
  constructor(
    private getProfileContactsQuery: GetProfileContactsQuery,
    private upsertProfileContactsCommand: UpsertProfileContactsCommand,
    private getProfileImageKeysQuery: GetProfileImageKeysQuery,
    private upsertProfileImageKeysCommand: UpsertProfileImageKeysCommand,
    private getStoreDetailsQuery: GetStoreDetailsQuery,
    private upsertStoreDetailsCommand: UpsertStoreDetailsCommand,
    private getProfileSpecialtiesQuery: GetProfileSpecialtiesQuery,
    private upsertProfileSpecialtiesCommand: UpsertProfileSpecialtiesCommand,
    private getUsersBySpecialtyQuery: GetUsersBySpecialtyQuery,
    private getProfileFulfillmentSettingsQuery: GetProfileFulfillmentSettingsQuery,
    private upsertProfileFulfillmentSettingsCommand: UpsertProfileFulfillmentSettingsCommand,
    private getUserByUidQuery: GetUserByUidQuery,
  ) {}

  async getContacts(uid: string): Promise<ProfileContactsData> {
    return traceServerLayer(
      "server-service",
      "ProfileService.getContacts",
      async () => {
        if (!uid) throw new Error("userNotFound");
        return this.getProfileContactsQuery.execute(uid);
      },
    );
  }

  async saveContacts(
    input: SaveProfileContactsInput,
  ): Promise<ProfileContactsData> {
    return traceServerLayer(
      "server-service",
      "ProfileService.saveContacts",
      async () => {
        if (!input.uid) throw new Error("userNotFound");
        const user = await this.getUserByUidQuery.execute(input.uid);
        if (!user) throw new Error("userNotFound");

        assertBrowserMergedContacts(user, input);
        return this.upsertProfileContactsCommand.execute(input);
      },
    );
  }

  async getStoreImages(uid: string): Promise<StoreImagesData> {
    return traceServerLayer(
      "server-service",
      "ProfileService.getStoreImages",
      async () => {
        if (!uid) throw new Error("userNotFound");
        const keys = await this.getProfileImageKeysQuery.execute(uid);
        const avatarImageKey = keys?.avatarImageKey ?? null;
        const coverImageKeys = normalizeCoverImageKeys(
          keys?.coverImageKeys ?? [],
        );
        const avatarExists = avatarImageKey
          ? await imageStorageOrchestrator.existsByKey(
              AVATAR_PROFILE_ID,
              avatarImageKey,
            )
          : false;
        const existingCoverImageKeys = (
          await Promise.all(
            coverImageKeys.map(async (key) => ({
              key,
              exists: await imageStorageOrchestrator.existsByKey(
                COVER_PROFILE_ID,
                key,
              ),
            })),
          )
        )
          .filter(({ exists }) => exists)
          .map(({ key }) => key);
        const existingCoverImageKey = existingCoverImageKeys[0] ?? null;

        return {
          avatarImageKey,
          coverImageKeys: existingCoverImageKeys,
          avatarUrl:
            avatarImageKey && avatarExists
              ? imageStorageOrchestrator.resolveUrl(
                  AVATAR_PROFILE_ID,
                  avatarImageKey,
                )
              : null,
          coverUrl: existingCoverImageKey
            ? imageStorageOrchestrator.resolveUrl(
                COVER_PROFILE_ID,
                existingCoverImageKey,
              )
            : null,
          coverUrls: existingCoverImageKeys.map((key) =>
            imageStorageOrchestrator.resolveUrl(COVER_PROFILE_ID, key),
          ),
        };
      },
    );
  }

  async saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData> {
    return traceServerLayer(
      "server-service",
      "ProfileService.saveStoreImages",
      async () => {
        if (!input.uid) throw new Error("userNotFound");

        const existing = await this.getProfileImageKeysQuery.execute(input.uid);
        const nextCoverImageKeys =
          input.coverImageKeys !== undefined
            ? normalizeCoverImageKeys(input.coverImageKeys)
            : normalizeCoverImageKeys(existing?.coverImageKeys ?? []);

        await this.upsertProfileImageKeysCommand.execute(input.uid, {
          avatarImageKey:
            input.avatarImageKey !== undefined
              ? input.avatarImageKey
              : (existing?.avatarImageKey ?? null),
          coverImageKeys: nextCoverImageKeys,
        });

        return this.getStoreImages(input.uid);
      },
    );
  }

  async getStoreDetails(uid: string): Promise<StoreDetailsData> {
    return traceServerLayer(
      "server-service",
      "ProfileService.getStoreDetails",
      async () => {
        if (!uid) throw new Error("userNotFound");
        return this.getStoreDetailsQuery.execute(uid);
      },
    );
  }

  async saveStoreDetails(
    input: SaveStoreDetailsInput,
  ): Promise<StoreDetailsData> {
    return traceServerLayer(
      "server-service",
      "ProfileService.saveStoreDetails",
      async () => {
        if (!input.uid) throw new Error("userNotFound");
        return this.upsertStoreDetailsCommand.execute(input);
      },
    );
  }

  async getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection> {
    if (!uid) throw new Error("userNotFound");
    return this.getProfileSpecialtiesQuery.execute(uid);
  }

  async getFulfillmentSettings(
    uid: string,
  ): Promise<ProfileFulfillmentSettings> {
    if (!uid) throw new Error("userNotFound");
    return this.getProfileFulfillmentSettingsQuery.execute(uid);
  }

  async saveFulfillmentSettings(
    input: SaveProfileFulfillmentSettingsInput,
  ): Promise<ProfileFulfillmentSettings> {
    if (!input.uid) throw new Error("userNotFound");
    const user = await this.getUserByUidQuery.execute(input.uid);
    if (!user) throw new Error("userNotFound");
    return this.upsertProfileFulfillmentSettingsCommand.execute(input);
  }

  async saveSpecialties(
    input: SaveProfileSpecialtiesInput,
  ): Promise<ProfileSpecialtiesSelection> {
    if (!input.uid) throw new Error("userNotFound");
    const user = await this.getUserByUidQuery.execute(input.uid);
    if (!user) throw new Error("userNotFound");
    return this.upsertProfileSpecialtiesCommand.execute(
      input.uid,
      normalizeSpecialties(input, {
        unlimited: isSuperAdminIdentity(user.uid, user.phone),
      }),
    );
  }

  async getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ) {
    return this.getUsersBySpecialtyQuery.execute(
      categoryId,
      subcategoryId,
      offset,
      limit,
      search,
      minRating,
    );
  }

  async saveEditor(
    input: SaveProfileEditorInput,
  ): Promise<SaveProfileEditorResult> {
    return traceServerLayer(
      "server-service",
      "ProfileService.saveEditor",
      async () => {
        if (!input.uid) throw new Error("userNotFound");
        const user = await this.getUserByUidQuery.execute(input.uid);
        if (!user) throw new Error("userNotFound");

        const changedSections = new Set(input.changedSections);
        let registration = {
          uid: input.uid,
          phone: user.phone,
          email: user.email?.trim() || null,
        };

        if (
          changedSections.has("registration") ||
          changedSections.has("contact")
        ) {
          assertBrowserMergedContacts(input.registration, input.contacts);
        }

        if (changedSections.has("registration")) {
          if (
            comparablePhone(input.registration.phone) !==
              comparablePhone(user.phone) &&
            !input.registration.phoneVerified
          ) {
            throw new Error("phoneVerificationRequired");
          }
          if (
            input.registration.newPassword !==
            input.registration.confirmPassword
          ) {
            throw new Error("invalidProfileEditor");
          }

          registration = await authOperationsService.updateProfile({
            uid: input.uid,
            phone: input.registration.phone,
            email: input.registration.email,
            currentPassword: input.registration.newPassword
              ? input.registration.currentPassword
              : undefined,
            newPassword: input.registration.newPassword || undefined,
            sessionToken: input.sessionToken,
          });
        }

        let contacts = input.contacts;
        if (
          changedSections.has("registration") ||
          changedSections.has("contact")
        ) {
          contacts = await this.upsertProfileContactsCommand.execute({
            uid: input.uid,
            ...input.contacts,
          });
        }

        const storeDetails = changedSections.has("store")
          ? await this.upsertStoreDetailsCommand.execute({
              uid: input.uid,
              ...input.storeDetails,
            })
          : input.storeDetails;

        const specialties = changedSections.has("specialties")
          ? await this.upsertProfileSpecialtiesCommand.execute(
              input.uid,
              normalizeSpecialties(input.specialties, {
                unlimited: isSuperAdminIdentity(user.uid, user.phone),
              }),
            )
          : input.specialties;

        return { registration, contacts, storeDetails, specialties };
      },
    );
  }
}
