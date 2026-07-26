import 'server-only';

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { getPasswordRecoveryConfig } from '@/core/config/server-env';
import { PasswordRecoveryOperations } from '../operations/password-recovery.operations';
import {
  maskRecoveryEmail,
  normalizeRecoveryPhone,
  PASSWORD_RECOVERY_POLICY,
} from '../password-recovery-policy';
import type {
  RecoveryRequestInput,
  RecoveryRequestResult,
  RecoveryResetInput,
  RecoveryResetResult,
  RecoveryVerifyInput,
  RecoveryVerifyResult,
} from '../types';
import { PasswordRecoveryEmailService } from './password-recovery-email-service.server';

export class PasswordRecoveryService {
  constructor(
    private readonly operations = new PasswordRecoveryOperations(),
    private readonly mailer = new PasswordRecoveryEmailService(),
  ) {}

  private digest(value: string): string {
    const { signingSecret } = getPasswordRecoveryConfig();
    return createHmac('sha256', signingSecret).update(value).digest('hex');
  }

  async requestCode(input: RecoveryRequestInput, requestIp: string): Promise<RecoveryRequestResult> {
    const phone = normalizeRecoveryPhone(input.phone);
    const phoneHash = this.digest(`phone:${phone}`);
    const requestIpHash = this.digest(`ip:${requestIp || 'unknown'}`);
    const now = new Date();
    const since = new Date(now.getTime() - PASSWORD_RECOVERY_POLICY.rateWindowMs).toISOString();

    const [phoneRequests, ipRequests] = await this.operations.countRecent(
      phoneHash,
      requestIpHash,
      since,
    );
    if (
      phoneRequests >= PASSWORD_RECOVERY_POLICY.maxPhoneRequests ||
      ipRequests >= PASSWORD_RECOVERY_POLICY.maxIpRequests
    ) {
      throw new Error('passwordRecoveryRateLimited');
    }

    const user = await this.operations.getUserByPhone(phone);
    const code = randomInt(100000, 1000000).toString();
    const id = randomBytes(18).toString('hex');
    await this.operations.createChallenge({
      id,
      phoneHash,
      uid: user?.uid ?? null,
      codeHash: this.digest(`code:${id}:${code}`),
      requestIpHash,
      expiresAt: new Date(now.getTime() + PASSWORD_RECOVERY_POLICY.codeTtlMs).toISOString(),
      attempts: 0,
      createdAt: now.toISOString(),
    });

    if (!user) return { status: 'accepted' };
    const email = user.email?.trim();
    if (!email) return { status: 'contactAdmin' };

    await this.mailer.sendCode(email, code);
    return { status: 'sent', maskedEmail: maskRecoveryEmail(email), expiresInSeconds: 600 };
  }

  async verifyCode(input: RecoveryVerifyInput): Promise<RecoveryVerifyResult> {
    const phone = normalizeRecoveryPhone(input.phone);
    if (typeof input.code !== 'string' || !/^\d{6}$/.test(input.code)) {
      throw new Error('passwordRecoveryInvalidCode');
    }
    const phoneHash = this.digest(`phone:${phone}`);
    const challenge = await this.operations.findLatestActive(phoneHash, new Date().toISOString());

    if (
      !challenge ||
      !challenge.uid ||
      challenge.verifiedAt ||
      challenge.attempts >= PASSWORD_RECOVERY_POLICY.maxCodeAttempts
    ) {
      throw new Error('passwordRecoveryInvalidCode');
    }

    const candidate = this.digest(`code:${challenge.id}:${input.code}`);
    const valid = timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(challenge.codeHash, 'hex'));
    if (!valid) {
      await this.operations.recordFailedAttempt(
        challenge.id,
        challenge.attempts + 1,
        new Date().toISOString(),
      );
      throw new Error('passwordRecoveryInvalidCode');
    }

    const resetToken = randomBytes(32).toString('base64url');
    await this.operations.markVerified(
      challenge.id,
      this.digest(`reset:${resetToken}`),
      new Date().toISOString(),
    );
    return { resetToken, expiresInSeconds: 600 };
  }

  async resetPassword(input: RecoveryResetInput): Promise<RecoveryResetResult> {
    const phone = normalizeRecoveryPhone(input.phone);
    if (typeof input.password !== 'string' || input.password.length < 4) {
      throw new Error('passwordRecoveryWeakPassword');
    }
    if (input.password !== input.confirmPassword) throw new Error('passwordRecoveryPasswordMismatch');
    if (typeof input.resetToken !== 'string' || input.resetToken.length < 32) {
      throw new Error('passwordRecoveryInvalidToken');
    }

    const phoneHash = this.digest(`phone:${phone}`);
    const challenge = await this.operations.findVerifiedByToken(
      phoneHash,
      this.digest(`reset:${input.resetToken}`),
      new Date().toISOString(),
    );
    if (!challenge?.uid || !challenge.verifiedAt) throw new Error('passwordRecoveryInvalidToken');

    const password = createHash('sha256').update(input.password).digest('hex');
    await this.operations.updatePasswordAndConsume(
      challenge.uid,
      password,
      challenge.id,
      new Date().toISOString(),
    );
    return { success: true };
  }
}

export const passwordRecoveryService = new PasswordRecoveryService();
