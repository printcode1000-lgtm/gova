import type {
  RegistrationFormData,
  LoginFormData,
} from '@/lib/validation/auth';
import type {
  UpdateProfileInput,
  UserProfile,
} from '../entities/profile.entity';
import type { ProfileSpecialtiesSelection } from '@/features/profile/entities/profile-specialties.entity';

export interface LoginResult {
  uid: string;
  phone: string;
  email: string;
  specialties: ProfileSpecialtiesSelection;
}

export interface IAuthService {
  register(formData: RegistrationFormData): Promise<{ uid: string }>;
  login(formData: LoginFormData): Promise<LoginResult>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  logout(): Promise<void>;
}
