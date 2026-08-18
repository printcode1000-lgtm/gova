import { NativeCore } from '@asol/native-core';
import type { MobilePushCredentialBundle } from './types';

const DEVICE_KEY_PREF = 'asol.mobilePush.deviceKey.v1';
const CREDENTIALS_PREF = 'asol.mobilePush.credentials.v1';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function loadOrCreateDeviceKey(): Promise<CryptoKey> {
  const stored = await NativeCore.getPreference(DEVICE_KEY_PREF);
  let raw: Uint8Array;
  if (stored.ok && stored.value.value) {
    raw = base64ToBytes(stored.value.value);
  } else {
    raw = crypto.getRandomValues(new Uint8Array(32));
    await NativeCore.setPreference(DEVICE_KEY_PREF, bytesToBase64(raw));
  }
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(raw),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptCredentialBundle(
  bundle: MobilePushCredentialBundle,
): Promise<string> {
  const key = await loadOrCreateDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(bundle)),
  );
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.length);
  return bytesToBase64(packed);
}

export async function decryptCredentialBundle(
  packedBase64: string,
): Promise<MobilePushCredentialBundle | null> {
  try {
    const packed = base64ToBytes(packedBase64);
    if (packed.length < 28) return null;
    const iv = new Uint8Array(packed.subarray(0, 12));
    const ciphertext = new Uint8Array(packed.subarray(12));
    const key = await loadOrCreateDeviceKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as Partial<MobilePushCredentialBundle>;
    const projectId = String(parsed.projectId ?? '').trim();
    const clientEmail = String(parsed.clientEmail ?? '').trim();
    const privateKey = String(parsed.privateKey ?? '').trim();
    if (!projectId || !clientEmail || !privateKey) return null;
    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

export async function clearEncryptedCredentialStorage(): Promise<void> {
  await NativeCore.removePreference(CREDENTIALS_PREF);
  await NativeCore.removePreference(DEVICE_KEY_PREF);
}

export { CREDENTIALS_PREF };
