import type { IUserRepository } from '../../repositories/user-repository.interface';
import type { User } from '../../entities/user.entity';

export class CreateUserCommand {
  constructor(private userRepository: IUserRepository) {}

  async execute(user: Omit<User, 'id'>): Promise<void> {
    if (!user.phone || !user.password) {
      throw new Error('Phone and password are required');
    }

    // Check if phone number is already registered
    const existingUser = await this.userRepository.getByPhone(user.phone);
    if (existingUser) {
      throw new Error('phoneAlreadyRegistered'); // Use code/key for localization
    }

    await this.userRepository.create(user);
  }
}
