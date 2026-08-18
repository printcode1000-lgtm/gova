import { NativeCore } from '@asol/native-core';
import type { MobilePushCredentialBundle } from './types';
import {
  CREDENTIALS_PREF,
  clearEncryptedCredentialStorage,
  decryptCredentialBundle,
  encryptCredentialBundle,
} from './credential-store-crypto';

export async function loadMobilePushCredentials(): Promise<MobilePushCredentialBundle | null> {
  const stored = await NativeCore.getPreference(CREDENTIALS_PREF);
  if (!stored.ok || !stored.value.value) return null;
  return decryptCredentialBundle(stored.value.value);
}

export async function saveMobilePushCredentials(
  credentials: MobilePushCredentialBundle,
): Promise<void> {
  const encrypted = await encryptCredentialBundle(credentials);
  await NativeCore.setPreference(CREDENTIALS_PREF, encrypted);
}

export async function clearMobilePushCredentials(): Promise<void> {
  await clearEncryptedCredentialStorage();
}
