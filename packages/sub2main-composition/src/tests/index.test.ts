import { readFileSync } from 'fs';
import path from 'path';
import { SUB2MAIN_DECLARATION } from '@asol/account-declarations/sub2main';
import { assertSub2mainEnv, createSub2mainRuntime } from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runTests(): void {
  console.log('🧪 Running @asol/sub2main-composition tests...\n');

  const compositionSource = readFileSync(
    path.join(process.cwd(), 'packages/sub2main-composition/src/index.ts'),
    'utf8',
  );
  assert(
    !compositionSource.includes('@asol/vercel-deploy-core'),
    'sub2main-composition must import @asol/account-declarations/sub2main, not the deploy engine',
  );
  console.log('  ✔ Layer 3 door only: no deploy-engine import.');

  const runtime = createSub2mainRuntime();
  assert(runtime.accountName === SUB2MAIN_DECLARATION.project, 'account name matches declaration');
  assert(typeof runtime.profile.service === 'object', 'profile task bound');
  assert(typeof runtime.products.service === 'object', 'products task bound');
  assert(runtime.storage.writeAccess === true, 'storage task allows writes');
  assert(!('crypto' in runtime), 'sub2main exposes no crypto task');
  console.log('  ✔ createSub2mainRuntime factory and task shape verified.');

  let threw = false;
  try {
    assertSub2mainEnv({});
  } catch (error) {
    threw = true;
    for (const key of SUB2MAIN_DECLARATION.requiredEnv) {
      assert(
        error instanceof Error && error.message.includes(key),
        `missing required key ${key} is named in the error`,
      );
    }
  }
  assert(threw, 'empty environment throws');

  const complete: NodeJS.ProcessEnv = {};
  for (const key of SUB2MAIN_DECLARATION.requiredEnv) complete[key] = 'set-for-test';
  assertSub2mainEnv(complete);
  console.log('  ✔ missing required keys throw; complete env passes.');

  console.log('✅ @asol/sub2main-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ sub2main-composition test failed:', err);
  process.exit(1);
}
