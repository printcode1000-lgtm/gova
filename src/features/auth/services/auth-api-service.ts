import { govaApi, GOVA_API_ROUTES } from '@/core/api';
import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';
import type { UpdateProfileInput, UserProfile } from '../entities/profile.entity';
import { sessionService } from './session-service';
import { isAuthenticated } from '../entities/session.entity';
import type { IAuthService, LoginResult } from './auth-service.interface';

/**
 * Client-side auth adapter — delegates to GovaApiClient only.
 * Session persistence is owned by SessionService.
 */
export class AuthApiService implements IAuthService {
  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
    return govaApi.post<{ uid: string }>(GOVA_API_ROUTES.auth.register, formData);
  }

  async login(formData: LoginFormData): Promise<LoginResult> {
    return govaApi.post<LoginResult>(GOVA_API_ROUTES.auth.login, formData);
  }

  async getProfile(uid: string): Promise<UserProfile> {
    return govaApi.post<UserProfile>(GOVA_API_ROUTES.auth.profile, { uid });
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    return govaApi.put<UserProfile>(GOVA_API_ROUTES.auth.profile, input);
  }

  async logout(): Promise<void> {
    await govaApi.post(GOVA_API_ROUTES.auth.logout, {});
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await sessionService.getCurrentSession();
    return isAuthenticated(session);
  }
}

export const authApiService = new AuthApiService();
