import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { ORDERS_DECLARATION } from '@asol/account-declarations/orders';
import { assertOrdersEnv, createOrdersRuntime, type OrdersRuntime } from '../index';

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

export function checkOrdersTransitiveGraph(serviceDir: string): void {
  const files = [
    ...getAllFiles(serviceDir, ['.ts', '.tsx']),
    ...getAllFiles(path.join(process.cwd(), 'packages/orders-composition/src'), ['.ts', '.tsx']),
  ].filter((f) => !f.endsWith('.test.ts'));
  const forbiddenPatterns = [
    '@asol/storage-core',
    's3-client.adapter',
    'r2-object-store',
    'R2_DEV_URL',
    'R2_BUCKET',
  ];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of forbiddenPatterns) {
      assert(
        !content.includes(pattern),
        `C1 Violation: Orders service file ${file} contains forbidden image-storage reference "${pattern}".`,
      );
    }
  }
}

function runTests(): void {
  console.log('🧪 Running @asol/orders-composition tests...\n');

  // Test 1: Factory creates valid runtime
  const runtime: OrdersRuntime = createOrdersRuntime();
  assert(runtime.accountName === ORDERS_DECLARATION.project, 'Runtime account name matches declaration');
  assert(typeof runtime.database.listForActor === 'function', 'database task bound');
  assert(typeof runtime.database.actorFromInput === 'function', 'actorFromInput bound');
  assert(typeof runtime.config.serverEnv === 'object', 'config task bound');
  // An absent task is a capability this account cannot reach — the point of the split.
  assert(!('images' in runtime), 'orders must expose no images task');
  assert(!('crypto' in runtime), 'orders must expose no crypto task');
  console.log('  ✔ createOrdersRuntime factory creates valid runtime object.');

  // Test 2: C1 Transitive capability graph isolation (Orders reaches no image-storage code)
  const ordersServiceDir = path.join(process.cwd(), 'services/orders');
  checkOrdersTransitiveGraph(ordersServiceDir);
  console.log('  ✔ C1: Orders transitive graph contains zero image-storage capability code.');

  // Test 3: D5 — a missing required env key fails before any database work.
  //
  // Asserted against ORDERS_DECLARATION.requiredEnv rather than a hard-coded name. An
  // earlier version of this composition checked MARKETPLACE_ORDERS_DATABASE_URL and
  // TURSO_DATABASE_URL — neither of which this account holds — and the test passed
  // because it pinned that same invented name. A test and the code being wrong together
  // is the failure mode this assertion is shaped to avoid.
  let threw = false;
  try {
    assertOrdersEnv({});
  } catch (error) {
    threw = true;
    for (const key of ORDERS_DECLARATION.requiredEnv) {
      assert(
        error instanceof Error && error.message.includes(key),
        `D5: error names the missing required key ${key}`,
      );
    }
  }
  assert(threw, 'D5: an empty environment throws before any database work');

  // And it must pass once the declared keys are present — a validator that always throws
  // would satisfy the assertion above while breaking the deployment.
  const complete: NodeJS.ProcessEnv = {};
  for (const key of ORDERS_DECLARATION.requiredEnv) complete[key] = 'set-for-test';
  assertOrdersEnv(complete);
  console.log('  ✔ D5: missing required keys throw and name themselves; complete env passes.');

  console.log('✅ @asol/orders-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ orders-composition test failed:', err);
  process.exit(1);
}
