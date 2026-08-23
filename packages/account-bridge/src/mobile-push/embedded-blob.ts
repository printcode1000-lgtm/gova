import { accountBridgePublicEnv } from '../ports/app-bridge';

/**
 * AES-256-GCM ciphertext baked into native/static bundles.
 * Useless without the server-only unlock key; decrypted only via
 * `POST /api/notifications/mobile-push/unlock`.
 */
export function getEmbeddedMobilePushCredentialBlob(): string | null {
  const blob = accountBridgePublicEnv().mobilePushCredentialBlob.trim();
  return blob.length > 0 ? blob : null;
}
