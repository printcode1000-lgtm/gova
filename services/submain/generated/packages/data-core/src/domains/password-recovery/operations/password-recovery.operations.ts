import 'server-only';

import type { IUserRepository } from '../../auth/repositories/user-repository.interface';
import { userRepository } from '../../auth/repositories/user-repository';

export class PasswordRecoveryOperations {
  constructor(
    private readonly users: IUserRepository = userRepository,
  ) {}

  getUserByPhone(phone: string) {
    return this.users.getByPhone(phone);
  }

  updatePassword(uid: string, password: string) {
    return this.users.update(uid, { password });
  }
}
