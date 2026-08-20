import { readEnv, requireEnv } from "@asol/env-core";

/**
 * Reading rules come from `@asol/env-core`; the keys and what they mean stay here.
 *
 * `requireEnv` is re-exported because the application already imports it from this module and it
 * is the same function — a second implementation of "throw when unset" is how `""` came to mean
 * two different things in one process.
 */
export { requireEnv };

export function getMobilePushUnlockKeyBuffer(): Buffer | null {
  const raw = readEnv("ASOL_MOBILE_PUSH_UNLOCK_KEY");
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const decoded = Buffer.from(raw, "base64");
  return decoded.length === 32 ? decoded : null;
}

export function isMobilePushUnlockConfigured(): boolean {
  return getMobilePushUnlockKeyBuffer() !== null;
}

export function getOptionalMobilePushServerCredentialBlob(): string {
  return readEnv("ASOL_MOBILE_PUSH_CREDENTIAL_BLOB");
}
