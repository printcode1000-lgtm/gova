import type { IUserRepository } from '@/modules/data-access/domains/auth/repositories/user-repository.interface';
import type { UserProfile, UpdateProfileInput } from '@/features/auth/entities/profile.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';
import { normalizeAuthPhone } from '@/features/auth/utils/phone-normalization';
import { hashPassword } from '@/features/auth/utils/password-hash.server';
import { normalizeAuthEmail } from '@/features/auth/utils/email-normalization';

export class UpdateUserProfileCommand {
  constructor(private userRepository: IUserRepository) {}

  async execute(input: UpdateProfileInput): Promise<UserProfile> {
    return traceServerLayer('query-command', 'UpdateUserProfileCommand', async () => {
      const user = await this.userRepository.getByUid(input.uid);
      if (!user) throw new Error('userNotFound');

      if (input.newPassword) {
        if (!input.currentPassword) throw new Error('currentPasswordRequired');
        const currentHash = await hashPassword(input.currentPassword);
        if (user.password !== currentHash) throw new Error('invalidCurrentPassword');
        await this.userRepository.update(input.uid, {
          password: await hashPassword(input.newPassword),
        });
      }

      const phone = normalizeAuthPhone(input.phone);
      const email = normalizeAuthEmail(input.email);

      if (phone !== user.phone) {
        const existing = await this.userRepository.getByPhone(phone);
        if (existing && existing.uid !== input.uid) {
          throw new Error('phoneAlreadyRegistered');
        }
      }

      if (email !== user.email && email) {
        const existing = await this.userRepository.getByEmail(email);
        if (existing && existing.uid !== input.uid) {
          throw new Error('emailAlreadyRegistered');
        }
      }

      try {
        await this.userRepository.update(input.uid, { phone, email });
      } catch (error) {
        if (email) {
          const existing = await this.userRepository.getByEmail(email);
          if (existing && existing.uid !== input.uid) {
            throw new Error('emailAlreadyRegistered');
          }
        }
        const existing = await this.userRepository.getByPhone(phone);
        if (existing && existing.uid !== input.uid) {
          throw new Error('phoneAlreadyRegistered');
        }
        throw error;
      }

      return {
        uid: input.uid,
        phone,
        email,
      };
    });
  }
}
