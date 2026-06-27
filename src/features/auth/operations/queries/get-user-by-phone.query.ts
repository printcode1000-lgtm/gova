import type { IUserRepository } from '../../repositories/user-repository.interface';
import type { User } from '../../entities/user.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class GetUserByPhoneQuery {
  constructor(private userRepository: IUserRepository) {}

  async execute(phone: string): Promise<User | null> {
    return traceServerLayer('query-command', 'GetUserByPhoneQuery', async () => {
      if (!phone) return null;
      return this.userRepository.getByPhone(phone);
    });
  }
}
