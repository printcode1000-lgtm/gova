export interface DeletionImage {
  profileId: 'avatar' | 'cover' | 'product-default' | 'spicialOrder';
  key: string;
}

export interface AccountDeletionUser {
  uid: string;
  phone: string;
  password: string;
}

export interface AccountDeletionRepositoryPort {
  getUser(uid: string): Promise<AccountDeletionUser | undefined>;
  collectImages(uid: string): Promise<DeletionImage[]>;
  anonymizeOrders(uid: string): Promise<void>;
  deleteProducts(uid: string): Promise<void>;
  deleteProfile(uid: string): Promise<void>;
  deleteMain(uid: string): Promise<void>;
}

export interface ImageDeletionPort {
  deleteImage(profileId: string, key: string): Promise<void>;
}
