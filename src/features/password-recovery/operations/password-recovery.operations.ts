import 'server-only';

import type { IUserRepository } from '@/features/auth/repositories/user-repository.interface';
import { userRepository } from '@/features/auth/repositories/user-repository';
import { PasswordRecoveryRepository } from '../repositories/password-recovery-repository';

export class PasswordRecoveryOperations {
  constructor(
    private readonly recovery = new PasswordRecoveryRepository(),
    private readonly users: IUserRepository = userRepository,
  ) {}

  getUserByPhone(phone: string) {
    return this.users.getByPhone(phone);
  }

  createChallenge(challenge: Parameters<PasswordRecoveryRepository['create']>[0]) {
    return this.recovery.create(challenge);
  }

  async countRecent(phoneHash: string, ipHash: string, since: string) {
    return Promise.all([
      this.recovery.countRecentByPhone(phoneHash, since),
      this.recovery.countRecentByIp(ipHash, since),
    ]);
  }

  findLatestActive(phoneHash: string, now: string) {
    return this.recovery.findLatestActive(phoneHash, now);
  }

  recordFailedAttempt(id: string, attempts: number, now: string) {
    return this.recovery.recordFailedAttempt(id, attempts, now);
  }

  markVerified(id: string, resetTokenHash: string, now: string) {
    return this.recovery.markVerified(id, resetTokenHash, now);
  }

  findVerifiedByToken(phoneHash: string, resetTokenHash: string, now: string) {
    return this.recovery.findVerifiedByToken(phoneHash, resetTokenHash, now);
  }

  async updatePasswordAndConsume(uid: string, password: string, challengeId: string, now: string) {
    await this.users.update(uid, { password });
    await this.recovery.markConsumed(challengeId, now);
  }
}
