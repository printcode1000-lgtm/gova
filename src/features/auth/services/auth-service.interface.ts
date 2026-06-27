import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';
import type { UpdateProfileInput, UserProfile } from '../entities/profile.entity';

export interface LoginResult {
  token: string;
  uid: string;
  phone: string;
  email: string;
}

export interface IAuthService {
  register(formData: RegistrationFormData): Promise<{ uid: string }>;
  login(formData: LoginFormData): Promise<LoginResult>;
  getProfile(uid: string): Promise<UserProfile>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
}
