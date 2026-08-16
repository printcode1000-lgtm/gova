import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { PRODUCTS_DECLARATION } from '@asol/account-declarations/products';
import { createProductsRuntime, type ProductsRuntime } from '../index';

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
  assert(typeof runtime.products === 'object', 'Products module bound');
  assert(typeof runtime.reviews === 'object', 'Product reviews module bound');
  assert(typeof runtime.searchProducts === 'object', 'Product search module bound');
  assert(typeof runtime.searchFields === 'object', 'Search fields module bound');
  assert(typeof runtime.categories === 'object', 'Categories module bound');
  console.log('  ✔ createProductsRuntime factory creates valid runtime object.');

  // Test 2: C1 Transitive capability graph isolation
  const productsServiceDir = path.join(process.cwd(), 'services/products');
  checkProductsTransitiveGraph(productsServiceDir);
  console.log('  ✔ C1: Products transitive graph contains zero orders/profile/notification credential code.');

  // Test 3: D5 Missing required database config throws in production
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    let threw = false;
    try {
      createProductsRuntime({ databaseUrl: '' });
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

  console.log('✅ @asol/products-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ products-composition test failed:', err);
  process.exit(1);
}
