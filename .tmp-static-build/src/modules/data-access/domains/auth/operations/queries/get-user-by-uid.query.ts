import type { IUserRepository } from '@/modules/data-access/domains/auth/repositories/user-repository.interface';
import type { User } from '@/features/auth/entities/user.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class GetUserByUidQuery {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string): Promise<User | null> {
    return traceServerLayer('query-command', 'GetUserByUidQuery', async () => {
      if (!uid) return null;
      return this.userRepository.getByUid(uid);
    });
  }
}
