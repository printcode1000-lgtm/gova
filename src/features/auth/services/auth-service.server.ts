import 'server-only';

import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';
import type { CreateUserCommand } from '../operations/commands/create-user.command';
import type { UpdateLastLoginCommand } from '../operations/commands/update-last-login.command';
import type { GetUserByPhoneQuery } from '../operations/queries/get-user-by-phone.query';
import type { IAuthService } from './auth-service.interface';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export class AuthService implements IAuthService {
  constructor(
    private createUserCommand: CreateUserCommand,
    private updateLastLoginCommand: UpdateLastLoginCommand,
    private getUserByPhoneQuery: GetUserByPhoneQuery
  ) {}

  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
    return traceServerLayer('server-service', 'AuthService.register', async () => {
      const hashedPassword = await hashPassword(formData.password);
      const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await this.createUserCommand.execute({
        uid,
        phone: formData.phone,
        email: formData.email || null,
        password: hashedPassword,
        last_login_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      });

      return { uid };
    });
  }

  async login(formData: LoginFormData): Promise<{ token: string; uid: string }> {
    return traceServerLayer('server-service', 'AuthService.login', async () => {
      const user = await this.getUserByPhoneQuery.execute(formData.phone);
      if (!user) {
        throw new Error('userNotFound');
      }

      const hashedInputPassword = await hashPassword(formData.password);
      if (user.password !== hashedInputPassword) {
        throw new Error('invalidPassword');
      }

      const token = generateToken();
      await this.updateLastLoginCommand.execute(user.uid);

      return { token, uid: user.uid };
    });
  }

  async logout(): Promise<void> {
    return traceServerLayer('server-service', 'AuthService.logout', async () => {
      // Session is client-side (IndexedDB). Server has no session state to clear.
    });
  }

  async isAuthenticated(): Promise<boolean> {
    // Auth status is determined client-side from IndexedDB cache.
    return false;
  }
}
