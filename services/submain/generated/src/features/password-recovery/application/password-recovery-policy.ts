import { normalizePhone } from '@asol/auth-core';

export const PASSWORD_RECOVERY_POLICY = {
  codeTtlMs: 10 * 60 * 1000,
  rateWindowMs: 15 * 60 * 1000,
  maxPhoneRequests: 3,
  maxIpRequests: 12,
  maxCodeAttempts: 5,
} as const;

export function normalizeRecoveryPhone(phone: unknown): string {
  try {
    return normalizePhone(phone);
  } catch {
    throw new Error('passwordRecoveryInvalidPhone');
  }
}

export function maskRecoveryEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(3, Math.min(8, local.length - 1)))}@${domain}`;
}
