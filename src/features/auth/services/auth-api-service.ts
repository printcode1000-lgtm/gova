import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';
import type { UpdateProfileInput, UserProfile } from '../entities/profile.entity';
import type { IAuthService, LoginResult } from './auth-service.interface';

/**
 * Client-side auth adapter — delegates to AsolApiClient only.
 * Session persistence is owned by SessionService.
 */
export class AuthApiService implements IAuthService {
  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
    return asolApi.post<{ uid: string }>(ASOL_API_ROUTES.auth.register, formData);
  }

  async login(formData: LoginFormData): Promise<LoginResult> {
    return asolApi.post<LoginResult>(ASOL_API_ROUTES.auth.login, formData);
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    return asolApi.put<UserProfile>(ASOL_API_ROUTES.auth.profile, input);
  }

  async logout(): Promise<void> {
    await asolApi.post(ASOL_API_ROUTES.auth.logout, {});
  }

  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    return asolApi.get<{ exists: boolean }>(
      `${ASOL_API_ROUTES.auth.checkPhone}?phone=${encodeURIComponent(phone)}`
    );
  }
}

export const authApiService = new AuthApiService();
