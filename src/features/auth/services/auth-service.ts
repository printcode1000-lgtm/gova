import { govaDbSetAuth, govaDbGetAuth } from '@/lib/gova-db';
import type { RegistrationFormData, LoginFormData } from '@/lib/validation/auth';
import type { IUserRepository } from '../repositories/user-repository.interface';
import { userRepository } from '../repositories/user-repository';
import { CreateUserCommand } from '../operations/commands/create-user.command';
import { UpdateLastLoginCommand } from '../operations/commands/update-last-login.command';
import { GetUserByPhoneQuery } from '../operations/queries/get-user-by-phone.query';
import type { IAuthService } from './auth-service.interface';

// Helper to hash password using Web Crypto API (SHA-256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  const cryptoProvider = typeof crypto !== 'undefined' ? crypto : (typeof window !== 'undefined' ? window.crypto : null);
  if (!cryptoProvider || !cryptoProvider.subtle) {
    throw new Error('Web Crypto API is not supported in this environment');
  }

  const hashBuffer = await cryptoProvider.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Helper to generate a mock auth token
function generateToken(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export class AuthService implements IAuthService {
  private createUserCommand: CreateUserCommand;
  private updateLastLoginCommand: UpdateLastLoginCommand;
  private getUserByPhoneQuery: GetUserByPhoneQuery;

  constructor(private userRepo: IUserRepository = userRepository) {
    this.createUserCommand = new CreateUserCommand(this.userRepo);
    this.updateLastLoginCommand = new UpdateLastLoginCommand(this.userRepo);
    this.getUserByPhoneQuery = new GetUserByPhoneQuery(this.userRepo);
  }

  async register(formData: RegistrationFormData): Promise<{ uid: string }> {
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
  }

  async login(formData: LoginFormData): Promise<{ token: string; uid: string }> {
    const user = await this.getUserByPhoneQuery.execute(formData.phone);
    if (!user) {
      throw new Error('userNotFound');
    }

    const hashedInputPassword = await hashPassword(formData.password);
    if (user.password !== hashedInputPassword) {
      throw new Error('invalidPassword');
    }

    const token = generateToken();

    // Update login timestamp in database
    await this.updateLastLoginCommand.execute(user.uid);

    // Save token to IndexedDB GovaDB store
    await govaDbSetAuth({ authToken: token });

    return { token, uid: user.uid };
  }

  async logout(): Promise<void> {
    await govaDbSetAuth({ authToken: undefined });
  }

  async isAuthenticated(): Promise<boolean> {
    const auth = await govaDbGetAuth();
    return !!auth.authToken;
  }
}

// Export singleton instance of the Auth Service
export const authService = new AuthService();
