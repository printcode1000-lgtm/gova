import "server-only";

import type { VerificationPurpose } from "@asol/verification-core";
import type { IUserRepository } from "../../auth/repositories/user-repository.interface";
import { userRepository } from "../../auth/repositories/user-repository";
import {
  VerificationChallengeRepository,
  type NewVerificationChallengeEntity,
} from "../repositories/verification-challenge-repository";

export class VerificationOperations {
  constructor(
    private readonly challenges = new VerificationChallengeRepository(),
    private readonly users: IUserRepository = userRepository,
  ) {}

  getUserByPhone(phone: string) {
    return this.users.getByPhone(phone);
  }

  getUserByUid(uid: string) {
    return this.users.getByUid(uid);
  }

  createChallenge(challenge: NewVerificationChallengeEntity) {
    return this.challenges.create(challenge);
  }

  async countRecent(phone: string, purpose: VerificationPurpose, ipHash: string, since: string) {
    return Promise.all([
      this.challenges.countRecentByPhonePurpose(phone, purpose, since),
      this.challenges.countRecentByIp(ipHash, since),
    ]);
  }

  findById(id: string) {
    return this.challenges.findById(id);
  }

  findByDispatchId(dispatchId: string) {
    return this.challenges.findByDispatchId(dispatchId);
  }

  recordFailedAttempt(id: string, attempts: number, now: string) {
    return this.challenges.recordFailedAttempt(id, attempts, now);
  }

  markVerified(id: string, proofNonceHash: string, now: string): Promise<boolean> {
    return this.challenges.markVerified(id, proofNonceHash, now);
  }

  markConsumed(id: string, now: string): Promise<boolean> {
    return this.challenges.markConsumed(id, now);
  }

  markDispatchRedeemed(id: string, codeHash: string, now: string): Promise<boolean> {
    return this.challenges.markDispatchRedeemed(id, codeHash, now);
  }

  rotateForResend(input: Parameters<VerificationChallengeRepository["rotateForResend"]>[0]): Promise<boolean> {
    return this.challenges.rotateForResend(input);
  }

  recordDispatchStatus(id: string, status: string, failureCode: string | null, now: string) {
    return this.challenges.recordDispatchStatus(id, status, failureCode, now);
  }
}
