import assert from 'node:assert/strict';
import {
  ACCOUNT_DELETION_PHRASE_AR,
  ACCOUNT_DELETION_PHRASE_EN,
  MIN_PASSWORD_LENGTH,
  assertPasswordMeetsMinimum,
  createRegistrationSchema,
  isAccountDeletionPhraseValid,
  readPasswordInput,
} from '../index';
import * as runtimeApi from '../index';
import * as serverApi from '../server';
import {
  createSignedSessionToken,
  hashPassword,
  registerSessionSigningSecret,
  verifyPassword,
  verifySignedSessionToken,
} from '../server';

export function runConstantsTest() {
  assert.equal(MIN_PASSWORD_LENGTH, 4);
  assert.equal(isAccountDeletionPhraseValid(ACCOUNT_DELETION_PHRASE_EN), true);
  assert.equal(isAccountDeletionPhraseValid(ACCOUNT_DELETION_PHRASE_AR), true);
  assert.equal(isAccountDeletionPhraseValid('wrong phrase'), false);
  console.log('✅ auth-core constants test passed');
}

export function runPasswordInputTest() {
  assert.equal(readPasswordInput('0258'), '0258');
  assert.equal(readPasswordInput('0258')?.length, 4);
  assert.equal(assertPasswordMeetsMinimum('0258'), '0258');
  assert.throws(() => assertPasswordMeetsMinimum(258), /passwordTooShort/);
  assert.throws(() => assertPasswordMeetsMinimum('258'), /passwordTooShort/);
  assert.throws(() => assertPasswordMeetsMinimum('123'), /passwordTooShort/);

  const schema = createRegistrationSchema((key) => key);
  assert.equal(
    schema.safeParse({
      phone: '01026546550',
      password: '0258',
      confirmPassword: '0258',
      email: '',
      phoneVerified: true,
    }).success,
    true,
  );

  console.log('✅ auth-core password input test passed');
}

export async function runPasswordTest() {
  const hash = await hashPassword('secure-password');
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword('secure-password', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
  assert.equal(await verifyPassword('legacy', 'deadbeef'), false);
  console.log('✅ auth-core password test passed');
}

export function runSessionTokenTest() {
  registerSessionSigningSecret(() => 'auth-core-test-secret-0123456789abcdef');
  const token = createSignedSessionToken('usr_test', '01000000000');
  assert.equal(verifySignedSessionToken(token).uid, 'usr_test');
  assert.throws(() => verifySignedSessionToken(`${token}x`), /sessionTokenInvalid/);
  console.log('✅ auth-core session token test passed');
}

export function runPublicSurfaceTest() {
  assert.equal(typeof runtimeApi.createLoginSchema, 'function');
  assert.equal(typeof runtimeApi.isAccountDeletionPhraseValid, 'function');
  assert.equal(typeof runtimeApi.ACCOUNT_DELETION_TABLE_REGISTRY, 'object');
  assert.equal(typeof serverApi.AuthOperationsService, 'function');
  assert.equal(typeof serverApi.AccountDeletionService, 'function');
  assert.equal(typeof serverApi.deleteImagesWithRetry, 'function');
  assert.equal(typeof serverApi.hashPassword, 'function');
  console.log('✅ auth-core public surface test passed');
}

export async function runImageDeletionRetryTest() {
  let attempts = 0;
  const storage = {
    async deleteImage() {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('transient');
      }
    },
  };

  const result = await serverApi.deleteImagesWithRetry(
    [{ profileId: 'avatar', key: 'img-1' }],
    storage,
    { maxAttempts: 3, delayMs: 0 },
  );

  assert.equal(result.attempted, 1);
  assert.equal(result.deleted, 1);
  assert.deepEqual(result.failed, []);
  console.log('✅ auth-core image deletion retry test passed');
}

async function main() {
  console.log('🚀 Running @asol/auth-core test suite...\n');
  runConstantsTest();
  runPasswordInputTest();
  await runPasswordTest();
  runSessionTokenTest();
  runPublicSurfaceTest();
  await runImageDeletionRetryTest();
  console.log('\n🎉 All @asol/auth-core tests passed successfully!');
}

main().catch((error) => {
  console.error('\n❌ @asol/auth-core test suite failed:', error);
  process.exit(1);
});
