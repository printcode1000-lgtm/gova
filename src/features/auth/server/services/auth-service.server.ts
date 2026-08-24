import 'server-only';

import type { RegistrationFormData, LoginFormData } from '@asol/auth-core';
import type { UpdateProfileInput, UserProfile } from '../../domain/profile.entity';
import type { IAuthService, LoginResult } from '../../ports/auth-service.interface';
import { traceServerLayer } from '@asol/observability-core/server';
import { authOperationsService } from '../auth-core-bootstrap.server';

export class AuthService implements IAuthService {
  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
    return traceServerLayer('server-service', 'AuthService.register', () =>
      authOperationsService.register(formData),
    );
  }

  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    return traceServerLayer('server-service', 'AuthService.checkPhone', () =>
      authOperationsService.checkPhone(phone),
    );
  }

  async login(formData: LoginFormData): Promise<LoginResult> {
    return traceServerLayer('server-service', 'AuthService.login', () =>
      authOperationsService.login(formData),
    );
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    return traceServerLayer('server-service', 'AuthService.updateProfile', () =>
      authOperationsService.updateProfile(input),
    );
  }

  async logout(): Promise<void> {
    return traceServerLayer('server-service', 'AuthService.logout', async () => {
      // Session is client-side (IndexedDB). Server has no session state to clear.
    });
  }

  async getUserPhone(uid: string): Promise<string | null> {
    return traceServerLayer('server-service', 'AuthService.getUserPhone', () =>
      authOperationsService.getUserPhone(uid),
    );
  }
}