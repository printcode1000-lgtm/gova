import { readFileSync } from 'fs';
import path from 'path';
import { SUBMAIN_DECLARATION } from '@asol/account-declarations/submain';
import { assertSubmainEnv, createSubmainRuntime } from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runTests(): void {
  console.log('🧪 Running @asol/submain-composition tests...\n');

  const compositionSource = readFileSync(path.join(process.cwd(), 'packages/submain-composition/src/index.ts'), 'utf8');
  assert(
    !compositionSource.includes('@asol/vercel-deploy-core'),
    'submain-composition must import @asol/account-declarations/submain, not the deploy engine',
  );
  console.log('  ✔ Layer 3 door only: no deploy-engine import.');

  assert(
    compositionSource.includes(
      "import { registerNotificationsCorePorts } from '@/features/notifications/ports/notifications-core-ports';",
    ),
    'submain composition imports the application notifications-core registrar',
  );
  assert(
    compositionSource.includes('registerNotificationsCorePorts();'),
    'submain composition invokes the notifications-core registrar at composition startup',
  );
  console.log('  ✔ notification-core ports are registered by the isolated submain root.');

  const runtime = createSubmainRuntime();
  assert(runtime.accountName === SUBMAIN_DECLARATION.project, 'account name matches declaration');
  assert(typeof runtime.search.products === 'function', 'search.products bound');
  assert(typeof runtime.search.sellers === 'function', 'search.sellers bound');
  assert(typeof runtime.cart.resolveCartPrices === 'function', 'cart.resolveCartPrices bound');
  assert(!('images' in runtime), 'submain exposes no images task');
  assert(!('crypto' in runtime), 'submain exposes no crypto task');
  console.log('  ✔ createSubmainRuntime factory and task shape verified.');

  let threw = false;
  try {
    assertSubmainEnv({});
  } catch (error) {
    threw = true;
    for (const key of SUBMAIN_DECLARATION.requiredEnv) {
      assert(
        error instanceof Error && error.message.includes(key),
        `missing required key ${key} is named in the error`,
      );
    }
  }
  assert(threw, 'empty environment throws');

  const complete: NodeJS.ProcessEnv = {};
  for (const key of SUBMAIN_DECLARATION.requiredEnv) complete[key] = 'set-for-test';
  assertSubmainEnv(complete);
  console.log('  ✔ missing required keys throw; complete env passes.');

  console.log('✅ @asol/submain-composition tests passed!\n');
}

try {
  runTests();
} catch (err) {
  console.error('❌ submain-composition test failed:', err);
  process.exit(1);
}
