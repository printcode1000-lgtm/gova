import type { IUserRepository } from '../../repositories/user-repository.interface';
import type { UserProfile, UpdateProfileInput } from '../../entities/profile.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

      if (input.phone !== user.phone) {
        const existing = await this.userRepository.getByPhone(input.phone);
        if (existing && existing.uid !== input.uid) {
          throw new Error('phoneAlreadyRegistered');
        }
      }

      await this.userRepository.update(input.uid, {
        phone: input.phone,
        email: input.email.trim() || null,
      });

      return {
        uid: input.uid,
        phone: input.phone,
        email: input.email.trim() || null,
      };
    });
  }
}
