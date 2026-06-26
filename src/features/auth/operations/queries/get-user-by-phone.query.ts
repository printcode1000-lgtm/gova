import type { IUserRepository } from '../../repositories/user-repository.interface';
import type { User } from '../../entities/user.entity';

export class GetUserByPhoneQuery {
  constructor(private userRepository: IUserRepository) {}

  async execute(phone: string): Promise<User | null> {
    if (!phone) return null;
    return this.userRepository.getByPhone(phone);
  }
}
