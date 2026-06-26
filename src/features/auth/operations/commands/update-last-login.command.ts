import type { IUserRepository } from '../../repositories/user-repository.interface';

export class UpdateLastLoginCommand {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string): Promise<void> {
    if (!uid) throw new Error('User UID is required');
    
    await this.userRepository.update(uid, {
      last_login_at: new Date().toISOString(),
    });
  }
}
