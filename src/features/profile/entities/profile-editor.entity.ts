import type { UserProfile } from '@/features/auth/entities/profile.entity';
import type { ProfileContactsData } from './profile-contacts.entity';
import type { StoreDetailsData } from './store-details.entity';

export type ProfileEditorSection = 'registration' | 'contact' | 'store';

export interface ProfileRegistrationSnapshot {
  phone: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phoneVerified: boolean;
}

export interface SaveProfileEditorInput {
  uid: string;
  changedSections: ProfileEditorSection[];
  registration: ProfileRegistrationSnapshot;
  contacts: ProfileContactsData;
  storeDetails: StoreDetailsData;
}

export interface SaveProfileEditorResult {
  registration: UserProfile;
  contacts: ProfileContactsData;
  storeDetails: StoreDetailsData;
}
