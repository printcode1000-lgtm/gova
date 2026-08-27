import type { ProfileSpecialtiesSelection, UserProfile } from '../domain/entities';

export interface AuthUserRecord {
  uid: string;
  phone: string;
  email: string | null;
  password: string;
}

export interface AuthUserRepositoryPort {
  createUser(input: {
    uid: string;
    phone: string;
    email: string | null;
    password: string;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }): Promise<void>;
  getByPhone(phone: string): Promise<AuthUserRecord | null>;
  getByUid(uid: string): Promise<AuthUserRecord | null>;
  getByEmail(email: string): Promise<AuthUserRecord | null>;
  update(uid: string, patch: { phone?: string; email?: string; password?: string }): Promise<void>;
  updateLastLogin(uid: string): Promise<void>;
}

export interface ProfileSpecialtiesPort {
  getProfileSpecialties(uid: string): Promise<ProfileSpecialtiesSelection>;
}

export interface ProfileStoreNamePort {
  saveStoreName(uid: string, storeName: string): Promise<void>;
}
