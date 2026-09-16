import 'server-only';

import { hashPassword } from '@asol/auth-core/server';
import { assertPasswordMeetsMinimum, readPasswordInput } from '@asol/auth-core';
import { PasswordRecoveryOperations } from '@asol/data-core/password-recovery';
import { verificationChannelForPhone } from '@asol/verification-core';
import { verificationProofConsumer } from '@/features/verification/ports';
import { verificationService } from '@/features/verification/server';
import {
  maskRecoveryEmail,
  normalizeRecoveryPhone,
} from '../../application/password-recovery-policy';
import type {
  RecoveryRequestInput,
  RecoveryRequestResult,
  RecoveryResetInput,
  RecoveryResetResult,
  RecoveryVerifyInput,
  RecoveryVerifyResult,
} from '../../application/types';

export class PasswordRecoveryService {
  constructor(
    private readonly operations = new PasswordRecoveryOperations(),
  ) {}

  async requestCode(input: RecoveryRequestInput, requestIp: string): Promise<RecoveryRequestResult> {
    const phone = normalizeRecoveryPhone(input.phone);
    const user = await this.operations.getUserByPhone(phone);
    if (!user) return { status: 'accepted' };
    const email = user.email?.trim();
    const channel = verificationChannelForPhone(phone);
    if (channel === 'international_email' && !email) return { status: 'contactAdmin' };

    const result = await verificationService.request(
      {
        purpose: 'password_recovery',
        phone,
        uid: user.uid,
        email: email ?? null,
        runtime: 'web',
      },
      requestIp,
    );

    if (result.channel === 'international_email') {
      return {
        status: 'sent',
        challengeId: result.challengeId,
        maskedEmail: maskRecoveryEmail(email!),
        expiresInSeconds: result.expiresInSeconds,
      };
    }

    return { status: 'accepted', challengeId: result.challengeId };
  }

  async verifyCode(input: RecoveryVerifyInput): Promise<RecoveryVerifyResult> {
    const phone = normalizeRecoveryPhone(input.phone);
    const user = await this.operations.getUserByPhone(phone);
    if (!user || !input.challengeId) {
      throw new Error('passwordRecoveryInvalidCode');
    }

    try {
      const result = await verificationService.verify({
        challengeId: input.challengeId,
        purpose: 'password_recovery',
        phone,
        uid: user.uid,
        email: user.email ?? null,
        code: input.code,
      });
      return { resetToken: result.verificationProof, expiresInSeconds: result.expiresInSeconds };
    } catch {
      throw new Error('passwordRecoveryInvalidCode');
    }
  }

  async resetPassword(input: RecoveryResetInput): Promise<RecoveryResetResult> {
    const phone = normalizeRecoveryPhone(input.phone);
    const plainPassword = assertPasswordMeetsMinimum(
      input.password,
      'passwordRecoveryWeakPassword',
    );
    const confirmPassword = readPasswordInput(input.confirmPassword);
    if (confirmPassword === null || plainPassword !== confirmPassword) {
      throw new Error('passwordRecoveryPasswordMismatch');
    }
    if (typeof input.resetToken !== 'string' || input.resetToken.length < 32) {
      throw new Error('passwordRecoveryInvalidToken');
    }

    const user = await this.operations.getUserByPhone(phone);
    if (!user) throw new Error('passwordRecoveryInvalidToken');

    try {
      await verificationProofConsumer.consume(input.resetToken, {
        purpose: 'password_recovery',
        phone,
        uid: user.uid,
        email: user.email ?? null,
        channel: verificationChannelForPhone(phone),
      });
    } catch {
      throw new Error('passwordRecoveryInvalidToken');
    }

    const hashedPassword = await hashPassword(plainPassword);
    await this.operations.updatePassword(user.uid, hashedPassword);
    return { success: true };
  }
}

export const passwordRecoveryService = new PasswordRecoveryService();
