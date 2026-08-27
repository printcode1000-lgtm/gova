import assert from 'node:assert/strict';
import {
  ACCOUNT_DELETION_PHRASE_AR,
  ACCOUNT_DELETION_PHRASE_EN,
  MIN_PASSWORD_LENGTH,
  assertPasswordMeetsMinimum,
  createRegistrationSchema,
  egyptianMobilePhoneValidationIssue,
  isAccountDeletionPhraseValid,
  normalizeEgyptianMobilePhone,
  readPasswordInput,
} from '../index';
import * as runtimeApi from '../index';
import * as serverApi from '../server';
import {
  AuthOperationsService,
  createSignedSessionToken,
  hashPassword,
  registerSessionSigningSecret,
  verifyPassword,
  verifySignedSessionToken,
  type AuthUserRecord,
  type AuthUserRepositoryPort,
} from '../server';

export function runConstantsTest() {
  assert.equal(MIN_PASSWORD_LENGTH, 4);
  assert.equal(isAccountDeletionPhraseValid(ACCOUNT_DELETION_PHRASE_EN), true);
  assert.equal(isAccountDeletionPhraseValid(ACCOUNT_DELETION_PHRASE_AR), true);
  assert.equal(isAccountDeletionPhraseValid('wrong phrase'), false);
  console.log('✅ auth-core constants test passed');
}

export function runPhoneTest() {
  assert.equal(normalizeEgyptianMobilePhone('010 1234 5678'), '01012345678');
  assert.equal(normalizeEgyptianMobilePhone('+20 10 1234 5678'), '01012345678');
  assert.equal(serverApi.normalizeAuthPhone('+20 10 1234 5678'), '01012345678');
  assert.equal(egyptianMobilePhoneValidationIssue(''), 'required');
  assert.equal(egyptianMobilePhoneValidationIssue('010000000001'), 'length');
  assert.equal(egyptianMobilePhoneValidationIssue('01312345678'), 'prefix');
  assert.throws(() => normalizeEgyptianMobilePhone('010000000001'), /invalidEgyptianMobilePhone:length/);

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
  assert.equal(
    schema.safeParse({
      phone: '010000000001',
      password: '0258',
      confirmPassword: '0258',
      email: '',
      phoneVerified: true,
    }).success,
    false,
  );

  console.log('✅ auth-core phone test passed');
}

export function runPasswordInputTest() {
  assert.equal(readPasswordInput('0258'), '0258');
  assert.equal(readPasswordInput('0258')?.length, 4);
  assert.equal(assertPasswordMeetsMinimum('0258'), '0258');
  assert.throws(() => assertPasswordMeetsMinimum(258), /passwordTooShort/);
  assert.throws(() => assertPasswordMeetsMinimum('258'), /passwordTooShort/);
  assert.throws(() => assertPasswordMeetsMinimum('123'), /passwordTooShort/);

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
  assert.equal(typeof runtimeApi.normalizeEgyptianMobilePhone, 'function');
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

function createMemoryUsers(): AuthUserRepositoryPort {
  const byUid = new Map<string, AuthUserRecord>();
  return {
    async createUser(input) {
      byUid.set(input.uid, {
        uid: input.uid,
        phone: input.phone,
        email: input.email,
        password: input.password,
      });
    },
    async getByPhone(phone) {
      return [...byUid.values()].find((user) => user.phone === phone) ?? null;
    },
    async getByUid(uid) {
      return byUid.get(uid) ?? null;
    },
    async getByEmail(email) {
      return [...byUid.values()].find((user) => user.email === email) ?? null;
    },
    async update() {},
    async updateLastLogin() {},
  };
}

export async function runRegistrationStoreNameTest() {
  const saved: Array<{ uid: string; storeName: string }> = [];
  const service = new AuthOperationsService(
    createMemoryUsers(),
    { getProfileSpecialties: async () => ({ main: [], sub: {} }) },
    {
      saveStoreName: async (uid, storeName) => {
        saved.push({ uid, storeName });
      },
    },
  );

  const created = await service.register({
    phone: '01026546550',
    password: '0258',
    storeName: '  متجر الاختبار  ',
  });
  assert.match(created.uid, /^usr_/);
  assert.deepEqual(saved, [{ uid: created.uid, storeName: 'متجر الاختبار' }]);

  saved.length = 0;
  await service.register({
    phone: '01126546550',
    password: '0258',
    storeName: '   ',
  });
  assert.deepEqual(saved, []);

  saved.length = 0;
  await service.register({
    phone: '01226546550',
    password: '0258',
  });
  assert.deepEqual(saved, []);

  console.log('✅ auth-core registration store name test passed');
}

export async function runSuperAdminAccountDeletionTest() {
  serverApi.registerSuperAdminIdentity(() => ({
    uid: 'super-admin-uid',
    phone: '01000000000',
  }));

  const executedSteps: string[] = [];
  const fakeRepo = {
    async getUser(uid: string) {
      if (uid === 'user-123') {
        return { uid: 'user-123', phone: '01111111111', password: 'hashed' };
      }
      if (uid === 'super-admin-uid') {
        return { uid: 'super-admin-uid', phone: '01000000000', password: 'hashed' };
      }
      return undefined;
    },
    async collectImages(uid: string) {
      executedSteps.push(`collect_images:${uid}`);
      return [{ profileId: 'avatar' as const, key: 'avatar-1' }];
    },
    async anonymizeOrders(uid: string) {
      executedSteps.push(`anonymize_orders:${uid}`);
    },
    async deleteProducts(uid: string) {
      executedSteps.push(`delete_products:${uid}`);
    },
    async deleteProfile(uid: string) {
      executedSteps.push(`delete_profile:${uid}`);
    },
    async deleteMain(uid: string) {
      executedSteps.push(`delete_main:${uid}`);
    },
  };

  const deletedKeys: string[] = [];
  const fakeStorage = {
    async deleteImage(profileId: string, key: string) {
      deletedKeys.push(`${profileId}:${key}`);
    },
  };

  const service = new serverApi.AccountDeletionService(fakeRepo, fakeStorage);

  await assert.rejects(
    () => service.deleteBySuperAdmin('super-admin-uid'),
    /accountDeletionSuperAdminForbidden/,
  );

  await assert.rejects(
    () => service.deleteBySuperAdmin('non-existent'),
    /userNotFound/,
  );

  const result = await service.deleteBySuperAdmin('user-123');
  assert.equal(result.deleted, true);
  assert.equal(result.imagesDeleted, 1);
  assert.deepEqual(deletedKeys, ['avatar:avatar-1']);
  assert.deepEqual(executedSteps, [
    'collect_images:user-123',
    'anonymize_orders:user-123',
    'delete_products:user-123',
    'delete_profile:user-123',
    'delete_main:user-123',
  ]);

  console.log('✅ auth-core super admin account deletion test passed');
}

async function main() {
  console.log('🚀 Running @asol/auth-core test suite...\n');
  runConstantsTest();
  runPhoneTest();
  runPasswordInputTest();
  await runPasswordTest();
  runSessionTokenTest();
  runPublicSurfaceTest();
  await runImageDeletionRetryTest();
  await runRegistrationStoreNameTest();
  await runSuperAdminAccountDeletionTest();
  console.log('\n🎉 All @asol/auth-core tests passed successfully!');
}

main().catch((error) => {
  console.error('\n❌ @asol/auth-core test suite failed:', error);
  process.exit(1);
});
