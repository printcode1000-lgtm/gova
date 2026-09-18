import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { NOTIFICATIONS_DECLARATION } from '@asol/account-declarations/notifications';
import { assertNotificationsEnv, createNotificationsRuntime, type NotificationsRuntime } from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function getAllFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        files.push(...getAllFiles(full, exts));
      }
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

export function checkNotificationsTransitiveGraph(serviceDir: string): void {
  const files = [
    ...getAllFiles(serviceDir, ['.ts', '.tsx']),
    ...getAllFiles(path.join(process.cwd(), 'packages/notifications-composition/src'), ['.ts', '.tsx']),
  ].filter((f) => !f.endsWith('.test.ts'));
  const forbiddenPatterns = [
    'MARKETPLACE_ORDERS_DATABASE',
    'PRODUCT_CATALOG_DATABASE',
    'PROFILE_CORE_DATABASE',
  ];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of forbiddenPatterns) {
      assert(
        !content.includes(pattern),
        `C1 Violation: Notifications service file ${file} contains forbidden database reference "${pattern}".`,
      );
    }
  }
}

function runTests(): void {
  console.log('🧪 Running @asol/notifications-composition tests...\n');

  // Test 1: Factory creates valid runtime
  const runtime: NotificationsRuntime = createNotificationsRuntime();
  assert(runtime.accountName === NOTIFICATIONS_DECLARATION.project, 'Runtime account name matches declaration');
  assert(typeof runtime.crypto.readGrants === 'function', 'crypto task bound');
  assert(typeof runtime.crypto.maxGrantsPerRequest === 'number', 'grant batch bound');
  assert(typeof runtime.delivery.deliverGrants === 'function', 'delivery task bound');
  // The only account with a crypto task, and the only one with no images task.
  assert(!('images' in runtime), 'notifications must expose no images task');
  console.log('  ✔ createNotificationsRuntime factory creates valid runtime object.');

  // Test 2: C1 Transitive capability graph isolation (Notifications reaches no orders/products/profile DB code)
  const notificationsServiceDir = path.join(process.cwd(), 'services/notifications');
  checkNotificationsTransitiveGraph(notificationsServiceDir);
  console.log('  ✔ C1: Notifications transitive graph contains zero product/order/profile data-access code.');

  // Test 3: D5 — a missing required env key fails before any work.
  //
  // Asserted against NOTIFICATIONS_DECLARATION.requiredEnv rather than a hard-coded name. An earlier
  // version checked variable names this account does not hold, and the test passed
  // because it pinned the same invented name. Code and test being wrong together is the
  // failure mode this shape avoids.
  let threw = false;
  try {
    assertNotificationsEnv({});
  } catch (error) {
    threw = true;
    for (const key of NOTIFICATIONS_DECLARATION.requiredEnv) {
      assert(
        error instanceof Error && error.message.includes(key),
        `D5: error names the missing required key ${key}`,
      );
    }
  }
  assert(threw, 'D5: an empty environment throws before any work');

  // And it must pass with the declared keys present — a validator that always throws
  // would satisfy the assertion above while breaking the deployment.
  const complete: NodeJS.ProcessEnv = {};
  for (const key of NOTIFICATIONS_DECLARATION.requiredEnv) complete[key] = 'set-for-test';
  assertNotificationsEnv(complete);
  console.log('  ✔ D5: missing required keys throw and name themselves; complete env passes.');

  // The account owns the whole notification surface: every session-bound task is bound.
  const deviceTasks = [
    'registerDeviceToken', 'listAccountDevices', 'removeDeviceToken', 'getPushPreference',
    'setPushPreference', 'sendSelfTest', 'sendBroadcastTest', 'listBroadcastRecipients',
    'sendBroadcast', 'assertSuperAdmin', 'resolveRecipientTokens', 'unlockMobilePush',
  ] as const;
  for (const task of deviceTasks) {
    assert(typeof runtime.devices[task] === 'function', `devices.${task} bound`);
  }
  assert(typeof runtime.account.assertSignedIn === 'function', 'account.assertSignedIn bound');
  console.log('  ✔ account and devices tasks cover every session-bound notification route.');

  console.log('✅ @asol/notifications-composition tests passed!\n');
}

/**
 * Broadcast fails closed until a root names the administrator. Importing this
 * composition must name them, or every `broadcast/*` request is `forbidden`.
 */
async function checkBroadcastAuthorization(): Promise<void> {
  const { assertNotificationAdmin } = await import(
    '@/features/notifications/server/notification-admin-authorization'
  );
  const { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } = await import('@asol/auth-core');
  assertNotificationAdmin({ uid: SUPER_ADMIN_UID, phone: SUPER_ADMIN_PHONE });
  let refused = false;
  try {
    assertNotificationAdmin({ uid: 'usr_someone', phone: '+201000000009' });
  } catch (error) {
    refused = error instanceof Error && error.message === 'forbidden';
  }
  assert(refused, 'a non-administrator must be refused');
  console.log('  ✔ broadcast authorisation is configured by the composition root.');
}

void (async () => {
  runTests();
  await checkBroadcastAuthorization();
})().catch((err) => {
  console.error('❌ notifications-composition test failed:', err);
  process.exit(1);
});
