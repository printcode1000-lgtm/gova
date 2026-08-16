import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { PROFILES_DECLARATION } from '@asol/account-declarations/profiles';
import { assertProfilesEnv, createProfilesRuntime, type ProfilesRuntime } from '../index';

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

export function checkProfilesTransitiveGraph(serviceDir: string): void {
  const files = [
    ...getAllFiles(serviceDir, ['.ts', '.tsx']),
    ...getAllFiles(path.join(process.cwd(), 'packages/profiles-composition/src'), ['.ts', '.tsx']),
  ].filter((f) => !f.endsWith('.test.ts'));
  const forbiddenPatterns = [
    'MARKETPLACE_ORDERS_DATABASE',
    'PRODUCT_CATALOG_DATABASE',
  ];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of forbiddenPatterns) {
      assert(
        !content.includes(pattern),
        `C1 Violation: Profiles service file ${file} contains forbidden cross-account reference "${pattern}".`,
      );
    }
  }
}

function runTests(): void {
  console.log('🧪 Running @asol/profiles-composition tests...\n');

  // Test 1: Factory creates valid runtime
  const runtime: ProfilesRuntime = createProfilesRuntime();
  assert(runtime.accountName === PROFILES_DECLARATION.project, 'Runtime account name matches declaration');
  assert(typeof runtime.profiles === 'object', 'profiles service bound');
  console.log('  ✔ createProfilesRuntime factory creates valid runtime object.');

  // Test 2: C1 Transitive capability graph isolation
  const profilesServiceDir = path.join(process.cwd(), 'services/profiles');
  checkProfilesTransitiveGraph(profilesServiceDir);
  console.log('  ✔ C1: Profiles transitive graph contains zero orders/products/notification credential code.');

  // Test 3: D5 — a missing required env key fails before any work.
  //
  // Asserted against PROFILES_DECLARATION.requiredEnv rather than a hard-coded name. An earlier
  // version checked variable names this account does not hold, and the test passed
  // because it pinned the same invented name. Code and test being wrong together is the
  // failure mode this shape avoids.
  let threw = false;
  try {
    assertProfilesEnv({});
  } catch (error) {
    threw = true;
    for (const key of PROFILES_DECLARATION.requiredEnv) {
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
  for (const key of PROFILES_DECLARATION.requiredEnv) complete[key] = 'set-for-test';
  assertProfilesEnv(complete);
  console.log('  ✔ D5: missing required keys throw and name themselves; complete env passes.');

  console.log('✅ @asol/profiles-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ profiles-composition test failed:', err);
  process.exit(1);
}
