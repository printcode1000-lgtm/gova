import type { IUserRepository } from '@/modules/data-access/domains/auth/repositories/user-repository.interface';
import type { User } from '@/features/auth/entities/user.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class CreateUserCommand {
  constructor(private userRepository: IUserRepository) {}

  async execute(user: Omit<User, 'id'>): Promise<void> {
    return traceServerLayer('query-command', 'CreateUserCommand', async () => {
      if (!user.phone || !user.password) {
        throw new Error('Phone and password are required');
      }

      const existingUser = await this.userRepository.getByPhone(user.phone);
      if (existingUser) {
        throw new Error('phoneAlreadyRegistered');
      }

      await this.userRepository.create(user);
    });
  }
}
