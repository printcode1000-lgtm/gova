import assert from 'node:assert/strict';
import {
  ACCOUNT_DELETION_PHRASE_AR,
  ACCOUNT_DELETION_PHRASE_EN,
  MIN_PASSWORD_LENGTH,
  isAccountDeletionPhraseValid,
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
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.equal(isAccountDeletionPhraseValid(ACCOUNT_DELETION_PHRASE_EN), true);
  assert.equal(isAccountDeletionPhraseValid(ACCOUNT_DELETION_PHRASE_AR), true);
  assert.equal(isAccountDeletionPhraseValid('wrong phrase'), false);
  console.log('✅ auth-core constants test passed');
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
  assert.equal(typeof serverApi.AuthOperationsService, 'function');
  assert.equal(typeof serverApi.AccountDeletionService, 'function');
  assert.equal(typeof serverApi.hashPassword, 'function');
  console.log('✅ auth-core public surface test passed');
}

async function main() {
  console.log('🚀 Running @asol/auth-core test suite...\n');
  runConstantsTest();
  await runPasswordTest();
  runSessionTokenTest();
  runPublicSurfaceTest();
  console.log('\n🎉 All @asol/auth-core tests passed successfully!');
}

main().catch((error) => {
  console.error('\n❌ @asol/auth-core test suite failed:', error);
  process.exit(1);
});
