import { govaApi, GOVA_API_ROUTES } from '@/core/api';
import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';
import { sessionService } from './session-service';
import type { IAuthService } from './auth-service.interface';

/**
 * Client-side auth adapter — delegates to GovaApiClient only.
 * Session persistence is owned by SessionService.
 */
export class AuthApiService implements IAuthService {
  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
    return govaApi.post<{ uid: string }>(GOVA_API_ROUTES.auth.register, formData);
  }

  async login(formData: LoginFormData): Promise<{ token: string; uid: string }> {
    return govaApi.post<{ token: string; uid: string }>(
      GOVA_API_ROUTES.auth.login,
      formData,
    );
  }

  async logout(): Promise<void> {
    await govaApi.post(GOVA_API_ROUTES.auth.logout, {});
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await sessionService.getCurrentSession();
    return session.status === 'authenticated';
  }
}

export const authApiService = new AuthApiService();
