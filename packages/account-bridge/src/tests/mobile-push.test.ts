import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const mobilePushDir = path.join(repoRoot, 'packages/account-bridge/src/mobile-push');

function listTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...listTsFiles(full));
    else if (entry.endsWith('.ts')) results.push(full);
  }
  return results;
}

async function testCredentialStoreCryptoRoundtrip(): Promise<void> {
  const prefs = new Map<string, string>();
  const nativeCore = await import('@asol/native-core');
  const originalGet = nativeCore.NativeCore.getPreference;
  const originalSet = nativeCore.NativeCore.setPreference;
  const originalRemove = nativeCore.NativeCore.removePreference;

  nativeCore.NativeCore.getPreference = async (key: string) =>
    ({ ok: true, value: { value: prefs.get(key) ?? '' } }) as never;
  nativeCore.NativeCore.setPreference = async (key: string, value: string) => {
    prefs.set(key, value);
    return { ok: true, value: undefined } as never;
  };
  nativeCore.NativeCore.removePreference = async (key: string) => {
    prefs.delete(key);
    return { ok: true, value: undefined } as never;
  };

  try {
    const cryptoModule = await import('../mobile-push/credential-store-crypto.ts');
    const bundle = {
      projectId: 'asol-test',
      clientEmail: 'firebase@test.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----',
    };
    const encrypted = await cryptoModule.encryptCredentialBundle(bundle);
    assert.ok(!encrypted.includes('BEGIN PRIVATE KEY'), 'stored credentials must be encrypted');
    const restored = await cryptoModule.decryptCredentialBundle(encrypted);
    assert.deepEqual(restored, bundle);
    await cryptoModule.clearEncryptedCredentialStorage();
    assert.equal(prefs.size, 0, 'clear removes device key and ciphertext');
  } finally {
    nativeCore.NativeCore.getPreference = originalGet;
    nativeCore.NativeCore.setPreference = originalSet;
    nativeCore.NativeCore.removePreference = originalRemove;
  }
}

function testEmbeddedBlobModuleUsesPublicEnv(): void {
  const source = readFileSync(path.join(mobilePushDir, 'embedded-blob.ts'), 'utf8');
  assert.match(source, /publicEnv\.mobilePushCredentialBlob/);
  assert.doesNotMatch(source, /ASOL_MOBILE_PUSH_UNLOCK_KEY/);
}

function testEnrollmentSendsBlobFromBundle(): void {
  const source = readFileSync(path.join(mobilePushDir, 'enrollment.ts'), 'utf8');
  assert.match(source, /getEmbeddedMobilePushCredentialBlob/);
  assert.match(source, /credentialBlob/);
  assert.doesNotMatch(source, /BEGIN PRIVATE KEY/);
}

function testMobilePushSourcesContainNoServerSecrets(): void {
  const forbidden = [
    /ASOL_MOBILE_PUSH_UNLOCK_KEY/,
    /process\.env\.ASOL_MOBILE_PUSH_CREDENTIAL_BLOB/,
    /firebase-adminsdk@[a-z0-9.-]+\.iam\.gserviceaccount\.com/,
  ];
  for (const file of listTsFiles(mobilePushDir)) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(
        source,
        pattern,
        `${path.relative(repoRoot, file)} must not contain ${pattern}`,
      );
    }
    if (!file.endsWith('fcm-auth.ts')) {
      assert.doesNotMatch(
        source,
        /-----BEGIN PRIVATE KEY-----\\n[A-Za-z0-9+/=]{20,}/,
        `${path.relative(repoRoot, file)} must not embed a private key literal`,
      );
    }
  }
}

function testFcmAuthUsesWebCryptoOnly(): void {
  const source = readFileSync(path.join(mobilePushDir, 'fcm-auth.ts'), 'utf8');
  assert.match(source, /crypto\.subtle/);
  assert.doesNotMatch(source, /google-auth-library/);
  assert.doesNotMatch(source, /node:crypto/);
}

async function run(): Promise<void> {
  await testCredentialStoreCryptoRoundtrip();
  testEmbeddedBlobModuleUsesPublicEnv();
  testEnrollmentSendsBlobFromBundle();
  testMobilePushSourcesContainNoServerSecrets();
  testFcmAuthUsesWebCryptoOnly();
  console.log('account-bridge mobile-push tests passed.');
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
