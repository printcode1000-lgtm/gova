import 'server-only';

import { hashPassword, verifyPassword } from '@asol/auth-core/server';
import { assertSessionMatchesUid } from '@asol/auth-core/server';
import { normalizeAuthEmail, normalizeAuthPhone } from '@asol/auth-core/server';
import type { IUserRepository } from '@/modules/data-access/domains/auth/repositories/user-repository.interface';
import type { UserProfile, UpdateProfileInput } from '@/features/auth/entities/profile.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

/** @deprecated Profile updates are handled by `@asol/auth-core` via `authOperationsService`. */
export class UpdateUserProfileCommand {
  constructor(private userRepository: IUserRepository) {}

  async execute(input: UpdateProfileInput): Promise<UserProfile> {
    return traceServerLayer('query-command', 'UpdateUserProfileCommand', async () => {
      assertSessionMatchesUid(input.sessionToken, input.uid);

      const user = await this.userRepository.getByUid(input.uid);
      if (!user) throw new Error('userNotFound');

      if (input.newPassword) {
        if (!input.currentPassword) throw new Error('currentPasswordRequired');
        const currentValid = await verifyPassword(input.currentPassword, user.password ?? '');
        if (!currentValid) throw new Error('invalidCurrentPassword');
        await this.userRepository.update(input.uid, {
          password: await hashPassword(input.newPassword),
        });
      }

      const phone = normalizeAuthPhone(input.phone);
      const email = normalizeAuthEmail(input.email) ?? '';

      if (phone !== user.phone) {
        const existing = await this.userRepository.getByPhone(phone);
        if (existing && existing.uid !== input.uid) throw new Error('phoneAlreadyRegistered');
      }

      if (email !== user.email && email) {
        const existing = await this.userRepository.getByEmail(email);
        if (existing && existing.uid !== input.uid) throw new Error('emailAlreadyRegistered');
      }

      try {
        await this.userRepository.update(input.uid, { phone, email });
      } catch (error) {
        if (email) {
          const existing = await this.userRepository.getByEmail(email);
          if (existing && existing.uid !== input.uid) throw new Error('emailAlreadyRegistered');
        }
        const existing = await this.userRepository.getByPhone(phone);
        if (existing && existing.uid !== input.uid) throw new Error('phoneAlreadyRegistered');
        throw error;
      }

      return { uid: input.uid, phone, email };
    });
  }
}
