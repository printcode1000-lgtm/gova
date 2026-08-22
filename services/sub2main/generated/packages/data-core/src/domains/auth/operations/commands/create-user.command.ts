import type { IUserRepository } from '../../repositories/user-repository.interface';
import type { User } from '../../entities';
import { traceServerLayer } from '../../../../ports/telemetry';

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

      if (user.email) {
        const existingEmail = await this.userRepository.getByEmail(user.email);
        if (existingEmail) {
          throw new Error('emailAlreadyRegistered');
        }
      }

      try {
        await this.userRepository.create(user);
      } catch (error) {
        // Preserve domain errors when two registrations race past the pre-checks.
        if (user.email && await this.userRepository.getByEmail(user.email)) {
          throw new Error('emailAlreadyRegistered');
        }
        if (await this.userRepository.getByPhone(user.phone)) {
          throw new Error('phoneAlreadyRegistered');
        }
        throw error;
      }
    });
  }
}
