import type { IUserRepository } from '@/modules/data-access/domains/auth/repositories/user-repository.interface';
import type { User } from '@/features/auth/entities/user.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class UpdateUserCommand {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string, fields: Partial<User>): Promise<void> {
    return traceServerLayer('query-command', 'UpdateUserCommand', async () => {
      if (!uid) throw new Error('uid is required');
      await this.userRepository.update(uid, fields);
    });
  }
}
