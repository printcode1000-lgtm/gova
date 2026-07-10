import "server-only";

import type { GetProfileContactsQuery } from "../operations/queries/get-profile-contacts.query";
import type { UpsertProfileContactsCommand } from "../operations/commands/upsert-profile-contacts.command";
import type { GetProfileImageKeysQuery } from "../operations/queries/get-profile-image-keys.query";
import type { UpsertProfileImageKeysCommand } from "../operations/commands/upsert-profile-image-keys.command";
import type { GetStoreDetailsQuery } from "../operations/queries/get-store-details.query";
import type { UpsertStoreDetailsCommand } from "../operations/commands/upsert-store-details.command";
import type { GetProfileSpecialtiesQuery } from "../operations/queries/get-profile-specialties.query";
import type { UpsertProfileSpecialtiesCommand } from "../operations/commands/upsert-profile-specialties.command";
import type { GetUsersBySpecialtyQuery } from "../operations/queries/get-users-by-specialty.query";
import type { GetProfileFulfillmentSettingsQuery } from "../operations/queries/get-profile-fulfillment-settings.query";
import type { UpsertProfileFulfillmentSettingsCommand } from "../operations/commands/upsert-profile-fulfillment-settings.command";
import type { GetUserByUidQuery } from "@/features/auth/operations/queries/get-user-by-uid.query";
import type { UpdateUserProfileCommand } from "@/features/auth/operations/commands/update-user-profile.command";
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
import { imageStorageOrchestrator } from "@/core/storage/storage/image-storage-orchestrator.server";
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";
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
  return keys
    .filter((key) => typeof key === "string" && key.length > 0)
    .slice(0, MAX_COVER_IMAGES);
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
      return categoryService.getProfileMainOptions().some((item) => item.id === categoryId);
    });
  const main = options.unlimited ? validMain : validMain.slice(0, 3);
  const sub: Record<string, number[]> = {};
  if (value?.sub && typeof value.sub === "object") {
    for (const [categoryId, ids] of Object.entries(value.sub)) {
      if (!/^\d+$/.test(categoryId) || !Array.isArray(ids)) continue;
      const normalized = Array.from(new Set(ids.filter(Number.isInteger))).filter((id) =>
        categoryService.resolveLegacyProductSelection(categoryId, String(id)).valid,
      );
      if (normalized.length > 0) sub[categoryId] = normalized;
    }
  }
  return { main, sub };
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
    private updateUserProfileCommand: UpdateUserProfileCommand,
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
        const coverImageKey = coverImageKeys[0] ?? keys?.coverImageKey ?? null;
        const normalizedCoverImageKeys =
          coverImageKeys.length > 0
            ? coverImageKeys
            : coverImageKey
              ? [coverImageKey]
              : [];

        return {
          avatarImageKey,
          coverImageKey,
          coverImageKeys: normalizedCoverImageKeys,
          avatarUrl: avatarImageKey
            ? imageStorageOrchestrator.resolveUrl(
                AVATAR_PROFILE_ID,
                avatarImageKey,
              )
            : null,
          coverUrl: coverImageKey
            ? imageStorageOrchestrator.resolveUrl(
                COVER_PROFILE_ID,
                coverImageKey,
              )
            : null,
          coverUrls: normalizedCoverImageKeys.map((key) =>
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
            : input.coverImageKey !== undefined
              ? normalizeCoverImageKeys(
                  input.coverImageKey ? [input.coverImageKey] : [],
                )
              : normalizeCoverImageKeys(existing?.coverImageKeys ?? []);

        await this.upsertProfileImageKeysCommand.execute(input.uid, {
          avatarImageKey:
            input.avatarImageKey !== undefined
              ? input.avatarImageKey
              : (existing?.avatarImageKey ?? null),
          coverImageKey: nextCoverImageKeys[0] ?? null,
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
  ) {
    return this.getUsersBySpecialtyQuery.execute(categoryId, subcategoryId, offset, limit, search);
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

          registration = await this.updateUserProfileCommand.execute({
            uid: input.uid,
            phone: input.registration.phone,
            email: input.registration.email,
            currentPassword: input.registration.newPassword
              ? input.registration.currentPassword
              : undefined,
            newPassword: input.registration.newPassword || undefined,
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
