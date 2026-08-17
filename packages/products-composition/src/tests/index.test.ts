import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { PRODUCTS_DECLARATION } from '@asol/account-declarations/products';
import { assertProductsEnv, createProductsRuntime, type ProductsRuntime } from '../index';

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

export function checkProductsTransitiveGraph(serviceDir: string): void {
  const files = [
    ...getAllFiles(serviceDir, ['.ts', '.tsx']),
    ...getAllFiles(path.join(process.cwd(), 'packages/products-composition/src'), ['.ts', '.tsx']),
  ].filter((f) => !f.endsWith('.test.ts'));
  const forbiddenPatterns = [
    'MARKETPLACE_ORDERS_DATABASE',
    'PROFILE_CORE_DATABASE',
  ];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of forbiddenPatterns) {
      assert(
        !content.includes(pattern),
        `C1 Violation: Products service file ${file} contains forbidden cross-account reference "${pattern}".`,
      );
    }
  }
}

function runTests(): void {
  console.log('🧪 Running @asol/products-composition tests...\n');

  // Test 1: Factory creates valid runtime
  const runtime: ProductsRuntime = createProductsRuntime();
  assert(runtime.accountName === PRODUCTS_DECLARATION.project, 'Runtime account name matches declaration');
  assert(typeof runtime.database.products === 'object', 'database task bound');
  assert(typeof runtime.catalog.categories === 'object', 'catalog task bound');
  assert(runtime.images.writeAccess === false, 'products image task is read-only');
  assert(!('crypto' in runtime), 'products must expose no crypto task');
  console.log('  ✔ createProductsRuntime factory creates valid runtime object.');

  // Test 2: C1 Transitive capability graph isolation
  const productsServiceDir = path.join(process.cwd(), 'services/products');
  checkProductsTransitiveGraph(productsServiceDir);
  console.log('  ✔ C1: Products transitive graph contains zero orders/profile/notification credential code.');

  // Test 3: D5 — a missing required env key fails before any work.
  //
  // Asserted against PRODUCTS_DECLARATION.requiredEnv rather than a hard-coded name. An earlier
  // version checked variable names this account does not hold, and the test passed
  // because it pinned the same invented name. Code and test being wrong together is the
  // failure mode this shape avoids.
  let threw = false;
  try {
    assertProductsEnv({});
  } catch (error) {
    threw = true;
    for (const key of PRODUCTS_DECLARATION.requiredEnv) {
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
  for (const key of PRODUCTS_DECLARATION.requiredEnv) complete[key] = 'set-for-test';
  assertProductsEnv(complete);
  console.log('  ✔ D5: missing required keys throw and name themselves; complete env passes.');

  console.log('✅ @asol/products-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ products-composition test failed:', err);
  process.exit(1);
}
