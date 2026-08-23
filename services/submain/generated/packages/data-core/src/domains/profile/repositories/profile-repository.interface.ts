import type { ProfileContactsData } from "../entities";
import type { StoreDetailsData } from "../entities";
import type { ProfileSpecialtiesSelection } from "../entities";
import type { ProfileFulfillmentSettings } from "../entities";
import type { UserProfileRow } from "../../../core/database/profile/profile.schema";
export type { UserProfileRow };


export interface ProfileImageKeys {
  avatarImageKey: string | null;
  coverImageKeys: string[];
}

export interface IProfileRepository {
  getByUid(uid: string): Promise<ProfileContactsData | null>;
  upsert(uid: string, data: ProfileContactsData): Promise<void>;
  getImageKeys(uid: string): Promise<ProfileImageKeys | null>;
  upsertImageKeys(uid: string, keys: ProfileImageKeys): Promise<void>;
  getStoreDetails(uid: string): Promise<StoreDetailsData | null>;
  upsertStoreDetails(uid: string, details: StoreDetailsData): Promise<void>;
  getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection | null>;
  upsertSpecialties(
    uid: string,
    selection: ProfileSpecialtiesSelection,
  ): Promise<void>;
  getFulfillmentSettings(
    uid: string,
  ): Promise<ProfileFulfillmentSettings | null>;
  upsertFulfillmentSettings(
    uid: string,
    settings: ProfileFulfillmentSettings,
  ): Promise<void>;
  getDeliveryServiceUids(uids: string[]): Promise<string[]>;
  getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ): Promise<UserProfileRow[]>;
}
