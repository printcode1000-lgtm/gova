import type {
  LoginInput,
  LoginResult,
  ProfileSpecialtiesSelection,
  RegistrationInput,
  UpdateProfileInput,
  UserProfile,
} from '../domain/entities';
import type { AuthUserRepositoryPort, ProfileSpecialtiesPort } from '../ports/auth-repository.port';
import { assertPasswordMeetsMinimum } from '../domain/password-input';
import { normalizeAuthEmail, normalizeAuthPhone } from './normalize';
import { hashPassword, verifyPassword } from './password';
import { assertSessionMatchesUid } from './session-auth';
import { createSignedSessionToken } from './session-token';

export class AuthOperationsService {
  constructor(
    private users: AuthUserRepositoryPort,
    private specialties: ProfileSpecialtiesPort,
  ) {}

  async register(formData: RegistrationInput): Promise<{ uid: string }> {
    const password = assertPasswordMeetsMinimum(formData.password);
    const hashedPassword = await hashPassword(password);
    const phone = normalizeAuthPhone(formData.phone);
    const email = normalizeAuthEmail(formData.email);
    const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await this.users.createUser({
      uid,
      phone,
      email,
      password: hashedPassword,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    return { uid };
  }

  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    const user = await this.users.getByPhone(normalizeAuthPhone(phone));
    return { exists: user !== null };
  }

  async login(formData: LoginInput): Promise<LoginResult> {
    const user = await this.users.getByPhone(normalizeAuthPhone(formData.phone));
    if (!user) throw new Error('userNotFound');

    const passwordValid = await verifyPassword(formData.password, user.password);
    if (!passwordValid) throw new Error('invalidPassword');

    await this.users.updateLastLogin(user.uid);
    const specialtySelection = await this.specialties.getProfileSpecialties(user.uid);

    return {
      uid: user.uid,
      phone: user.phone,
      email: user.email ?? '',
      specialties: specialtySelection,
      sessionToken: createSignedSessionToken(user.uid, user.phone),
    };
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    assertSessionMatchesUid(input.sessionToken, input.uid);

    const user = await this.users.getByUid(input.uid);
    if (!user) throw new Error('userNotFound');

    if (input.newPassword) {
      if (!input.currentPassword) throw new Error('currentPasswordRequired');
      const currentValid = await verifyPassword(input.currentPassword, user.password);
      if (!currentValid) throw new Error('invalidCurrentPassword');
      const newPassword = assertPasswordMeetsMinimum(input.newPassword);
      await this.users.update(input.uid, {
        password: await hashPassword(newPassword),
      });
    }

    const phone = normalizeAuthPhone(input.phone);
    const email = normalizeAuthEmail(input.email) ?? '';

    if (phone !== user.phone) {
      const existing = await this.users.getByPhone(phone);
      if (existing && existing.uid !== input.uid) throw new Error('phoneAlreadyRegistered');
    }

    if (email !== user.email && email) {
      const existing = await this.users.getByEmail(email);
      if (existing && existing.uid !== input.uid) throw new Error('emailAlreadyRegistered');
    }

    try {
      await this.users.update(input.uid, { phone, email });
    } catch (error) {
      if (email) {
        const existing = await this.users.getByEmail(email);
        if (existing && existing.uid !== input.uid) throw new Error('emailAlreadyRegistered');
      }
      const existing = await this.users.getByPhone(phone);
      if (existing && existing.uid !== input.uid) throw new Error('phoneAlreadyRegistered');
      throw error;
    }

    return { uid: input.uid, phone, email };
  }

  async getUserPhone(uid: string): Promise<string | null> {
    const user = await this.users.getByUid(uid);
    const phone = user?.phone?.trim();
    return phone || null;
  }
}

export type { ProfileSpecialtiesSelection };
