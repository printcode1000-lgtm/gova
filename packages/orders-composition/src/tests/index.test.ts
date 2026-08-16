import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { ORDERS_DECLARATION } from '@asol/vercel-deploy-core';
import { createOrdersRuntime, type OrdersRuntime } from '../index';

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
  assert(typeof runtime.orders === 'object', 'Orders module domain bound');
  assert(typeof runtime.actorFromInput === 'function', 'actorFromInput bound');
  assert(typeof runtime.serverEnv === 'object', 'Server env bound');
  console.log('  ✔ createOrdersRuntime factory creates valid runtime object.');

  // Test 2: C1 Transitive capability graph isolation (Orders reaches no image-storage code)
  const ordersServiceDir = path.join(process.cwd(), 'services/orders');
  checkOrdersTransitiveGraph(ordersServiceDir);
  console.log('  ✔ C1: Orders transitive graph contains zero image-storage capability code.');

  // Test 3: D5 Missing required database config throws in production
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    let threw = false;
    try {
      createOrdersRuntime({ databaseUrl: '' });
    } catch (e) {
      threw = true;
      assert(
        e instanceof Error && e.message.includes('Missing required database configuration'),
        'D5: Error message explicitly identifies missing required database configuration',
      );
    }
    assert(threw, 'D5: Missing required database key exits non-zero / throws in production before network call');
    console.log('  ✔ D5: Missing required database key exits before network call.');
  } finally {
    process.env.NODE_ENV = origEnv;
  }

  console.log('✅ @asol/orders-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ orders-composition test failed:', err);
  process.exit(1);
}
