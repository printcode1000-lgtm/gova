import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import type { RegistrationFormData, LoginFormData } from '@asol/auth-core';
import type { UpdateProfileInput, UserProfile } from '../domain/profile.entity';
import type { IAuthService, LoginResult } from './auth-service.interface';

function sessionHeaders(sessionToken: string): Record<string, string> {
  return { 'x-asol-session-token': sessionToken };
}

export class AuthApiService implements IAuthService {
  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
    return asolApi.post<{ uid: string }>(ASOL_API_ROUTES.auth.register, formData);
  }

  async login(formData: LoginFormData): Promise<LoginResult> {
    return asolApi.post<LoginResult>(ASOL_API_ROUTES.auth.login, formData, {
      suppressErrorLog: true,
    });
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    return asolApi.put<UserProfile>(ASOL_API_ROUTES.auth.profile, input, {
      headers: sessionHeaders(input.sessionToken),
      suppressErrorLog: true,
    });
  }

  async logout(): Promise<void> {
    await asolApi.post(ASOL_API_ROUTES.auth.logout, {});
  }

  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    return asolApi.get<{ exists: boolean }>(
      `${ASOL_API_ROUTES.auth.checkPhone}?phone=${encodeURIComponent(phone)}`,
    );
  }
}

export const authApiService = new AuthApiService();
