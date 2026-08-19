export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} environment variable is not set`);
  return value;
}

export function getMobilePushUnlockKeyBuffer(): Buffer | null {
  const raw = process.env.ASOL_MOBILE_PUSH_UNLOCK_KEY?.trim() ?? "";
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const decoded = Buffer.from(raw, "base64");
  return decoded.length === 32 ? decoded : null;
}

export function isMobilePushUnlockConfigured(): boolean {
  return getMobilePushUnlockKeyBuffer() !== null;
}

export function getOptionalMobilePushServerCredentialBlob(): string {
  return process.env.ASOL_MOBILE_PUSH_CREDENTIAL_BLOB?.trim() ?? "";
}
