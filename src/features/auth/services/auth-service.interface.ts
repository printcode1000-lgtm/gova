import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';

export interface IAuthService {
  register(formData: RegistrationFormData): Promise<{ uid: string }>;
  login(formData: LoginFormData): Promise<{ token: string; uid: string }>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
}
