import type { ProfileContactsData } from "../entities/profile-contacts.entity";
import type { StoreDetailsData } from "../entities/store-details.entity";
import type { ProfileSpecialtiesSelection } from "../entities/profile-specialties.entity";

export interface ProfileImageKeys {
  avatarImageKey: string | null;
  coverImageKey: string | null;
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
}
