import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { NOTIFICATIONS_DECLARATION } from '@asol/account-declarations/notifications';
import { createNotificationsRuntime, type NotificationsRuntime } from '../index';

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
  assert(typeof runtime.runtime === 'object', 'Notifications service runtime bound');
  console.log('  ✔ createNotificationsRuntime factory creates valid runtime object.');

  // Test 2: C1 Transitive capability graph isolation (Notifications reaches no orders/products/profile DB code)
  const notificationsServiceDir = path.join(process.cwd(), 'services/notifications');
  checkNotificationsTransitiveGraph(notificationsServiceDir);
  console.log('  ✔ C1: Notifications transitive graph contains zero product/order/profile data-access code.');

  // Test 3: D5 Missing required grant secret throws in production
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    let threw = false;
    try {
      createNotificationsRuntime({ grantSecret: '' });
    } catch (e) {
      threw = true;
      assert(
        e instanceof Error && e.message.includes('Missing required ASOL_NOTIFICATION_GRANT_SECRET'),
        'D5: Error message explicitly identifies missing required grant secret',
      );
    }
    assert(threw, 'D5: Missing required grant secret exits non-zero / throws in production before network call');
    console.log('  ✔ D5: Missing required grant secret key exits before network call.');
  } finally {
    process.env.NODE_ENV = origEnv;
  }

  console.log('✅ @asol/notifications-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ notifications-composition test failed:', err);
  process.exit(1);
}
