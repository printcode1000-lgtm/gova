import { govaDbSetAuth, govaDbGetAuth } from '@/lib/gova-db';
import { govaApi, GOVA_API_ROUTES } from '@/core/api';
import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';
import type { IAuthService } from './auth-service.interface';

/**
 * Client-side auth adapter — delegates to GovaApiClient only.
 */
export class AuthApiService implements IAuthService {
  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
    return govaApi.post<{ uid: string }>(GOVA_API_ROUTES.auth.register, formData);
  }

  async login(formData: LoginFormData): Promise<{ token: string; uid: string }> {
    const result = await govaApi.post<{ token: string; uid: string }>(
      GOVA_API_ROUTES.auth.login,
      formData
    );
    await govaDbSetAuth({ authToken: result.token });
    return result;
  }

  async logout(): Promise<void> {
    await govaApi.post(GOVA_API_ROUTES.auth.logout, {});
    await govaDbSetAuth({ authToken: undefined });
  }

  async isAuthenticated(): Promise<boolean> {
    const auth = await govaDbGetAuth();
    return !!auth.authToken;
  }
}

export const authApiService = new AuthApiService();
