export const PASSWORD_RECOVERY_POLICY = {
  codeTtlMs: 10 * 60 * 1000,
  rateWindowMs: 15 * 60 * 1000,
  maxPhoneRequests: 3,
  maxIpRequests: 12,
  maxCodeAttempts: 5,
} as const;

export function normalizeRecoveryPhone(phone: unknown): string {
  const normalized = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  if (!/^(010|011|012|015)\d{8}$/.test(normalized)) {
    throw new Error('passwordRecoveryInvalidPhone');
  }
  return normalized;
}

export function maskRecoveryEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(3, Math.min(8, local.length - 1)))}@${domain}`;
}
