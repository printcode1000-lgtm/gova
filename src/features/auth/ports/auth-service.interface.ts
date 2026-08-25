import type {
  RegistrationFormData,
  LoginFormData,
} from '@asol/auth-core';
import type {
  UpdateProfileInput,
  UserProfile,
} from '../domain/profile.entity';
import type { ProfileSpecialtiesSelection } from '@asol/data-core/profile/entities';

export interface LoginResult {
  uid: string;
  phone: string;
  email: string;
  specialties: ProfileSpecialtiesSelection;
  sessionToken: string;
}

export interface IAuthService {
  register(formData: RegistrationFormData): Promise<{ uid: string }>;
  login(formData: LoginFormData): Promise<LoginResult>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  logout(): Promise<void>;
  checkPhone(phone: string): Promise<{ exists: boolean }>;
}
