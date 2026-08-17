import type { IUserRepository } from '@/modules/data-access/domains/auth/repositories/user-repository.interface';
import type { User } from '@/features/auth/entities/user.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class GetUserByEmailQuery {
  constructor(private userRepository: IUserRepository) {}

  async execute(email: string): Promise<User | null> {
    return traceServerLayer('query-command', 'GetUserByEmailQuery', async () => {
      if (!email) return null;
      return this.userRepository.getByEmail(email);
    });
  }
}
