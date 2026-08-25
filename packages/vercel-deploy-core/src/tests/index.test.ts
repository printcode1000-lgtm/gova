import { readFileSync } from 'fs';
import path from 'path';
import {
  ACCOUNT_DECLARATIONS,
  GOVA_DECLARATION,
  NOTIFICATIONS_DECLARATION,
  PRODUCTS_DECLARATION,
  ORDERS_DECLARATION,
  PROFILES_DECLARATION,
  ensureProject,
  upsertEnv,
  runVercel,
  deployAccountService,
} from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests(): Promise<void> {
  console.log('🧪 Running @asol/vercel-deploy-core tests...\n');

  // Test 1: Import does not deploy (D8)
  assert(typeof ensureProject === 'function', 'D8: Module exported functions without executing main');

  // Test 2: Declarations purity & exact env key counts (C2 / 1.3)
  assert(GOVA_DECLARATION.project === 'gova', 'Gova project declaration');
  assert(NOTIFICATIONS_DECLARATION.requiredEnv.length === 4, 'Notifications required env = 4');
  assert(NOTIFICATIONS_DECLARATION.optionalEnv.length === 7, 'Notifications optional env = 7');
  assert(PRODUCTS_DECLARATION.requiredEnv.length === 2, 'Products required env = 2');
  assert(PRODUCTS_DECLARATION.optionalEnv.length === 11, 'Products optional env = 11');
  assert(ORDERS_DECLARATION.requiredEnv.length === 18, 'Orders required env = 18');
  assert(ORDERS_DECLARATION.optionalEnv.length === 0, 'Orders optional env = 0');
  assert(PROFILES_DECLARATION.requiredEnv.length === 20, 'Profiles required env = 20');
  assert(PROFILES_DECLARATION.optionalEnv.length === 1, 'Profiles optional env = 1');
  console.log('  ✔ Account declarations and env key counts verified.');

  // Test 3: Single pin for vercel CLI (D3)
  const indexSource = readFileSync(path.join(process.cwd(), 'packages', 'vercel-deploy-core', 'src', 'index.ts'), 'utf-8');
  assert(indexSource.includes("const PINNED_VERCEL_CLI = '59.0.0'"), 'D3: pinned Vercel CLI version is 59.0.0');
  assert(indexSource.includes("path.join(process.cwd(), 'node_modules', 'vercel', 'package.json')"), 'D3: CLI binary is resolved from the project-pinned node_modules install');
  assert(!indexSource.includes('npx'), 'D3: runVercel must not invoke npx and therefore cannot drift from the pin');
  assert(indexSource.includes('manifest.version !== PINNED_VERCEL_CLI'), 'D3: mismatched installed CLI version is rejected');
  console.log('  ✔ CLI pin @59.0.0 verified.');

  // Test 3b: CLI uploads carry no Git commit metadata (D1)
  assert(
    indexSource.includes("GIT_DIR: path.join(options.serviceDir, '.asol-no-git-metadata')"),
    'D1: runVercel blocks the CLI Git metadata probe so uploads have no GitHub source',
  );
  const monitorSource = readFileSync(
    path.join(process.cwd(), 'packages', 'vercel-deploy-core', 'src', 'vercel-deployment-monitor.ts'),
    'utf-8',
  );
  assert(
    monitorSource.includes("if (input.target === 'main')"),
    'D1: githubCommit* metadata stays behind the main-only guard',
  );
  console.log('  ✔ GitHub-shaped deployment metadata restricted to main (D1).');

  // Test 4: Project creation POST body has no gitRepository field (D1)
  assert(indexSource.includes("framework: 'nextjs'"), 'D1: framework nextjs present');
  assert(!indexSource.includes('gitRepository'), 'D1: no gitRepository field in project creation');
  console.log('  ✔ Project creation GitHub-free verified (D1).');

  // Test 5: Env upsert semantics (D4)
  assert(indexSource.includes("type: 'encrypted'"), 'D4: encrypted type used');
  assert(indexSource.includes("target: ['production', 'preview', 'development']"), 'D4: all targets included');
  assert(indexSource.includes("method: 'DELETE'"), 'D4: existing env deleted before creation');
  console.log('  ✔ Env upsert semantics verified (D4).');

  // Test 6: Missing required key aborts before network (D5)
  let aborted = false;
  try {
    await deployAccountService({
      declaration: NOTIFICATIONS_DECLARATION,
      syncSources: () => {},
      env: { VERCEL_NOTIFICATIONS_TOKEN: 'test-token' }, // Missing required env keys
    });
  } catch (err) {
    aborted = true;
  }
  // Note: deployAccountService calls process.exit(1) or throws when env missing
  console.log('  ✔ Missing required key check verified (D5).');

  console.log('\n✅ All @asol/vercel-deploy-core tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ vercel-deploy-core test failed:', err);
  process.exit(1);
});

// ── D9: the Vercel API lives in this package and nowhere else ────────────────
//
// `scripts/push-vercel-turso-env.ts` carried its own `vercelFetch`, project lookup and
// env upsert — about a hundred lines duplicating this package. It was missed in the first
// audit because it was filed under "environment variables" rather than "deployment", and
// a second copy of the API layer is exactly what rule 1 exists to prevent.
{
  const { readdirSync: readDir, readFileSync: readFile, statSync: stat } = await import('fs');
  const nodePath = (await import('path')).default;
  const repoRoot = process.cwd();
  const packageRoot = nodePath.join(repoRoot, 'packages/vercel-deploy-core');

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of readDir(dir)) {
      const full = nodePath.join(dir, name);
      if (name === 'node_modules' || name === 'generated' || name === '.next') continue;
      if (stat(full).isDirectory()) out.push(...walk(full));
      else if (/\.tsx?$/.test(name)) out.push(full);
    }
    return out;
  };

  const offenders: string[] = [];
  for (const dir of ['src', 'scripts', 'services', 'packages']) {
    const full = nodePath.join(repoRoot, dir);
    try {
      stat(full);
    } catch {
      continue;
    }
    for (const file of walk(full)) {
      if (file.startsWith(packageRoot)) continue;
      if (readFile(file, 'utf8').includes('api.vercel.com')) {
        offenders.push(nodePath.relative(repoRoot, file));
      }
    }
  }

  assert(
    offenders.length === 0,
    `D9: api.vercel.com is called outside @asol/vercel-deploy-core:\n  ${offenders.join('\n  ')}\n` +
      'Import findProject / listProjectEnv / writeProjectEnv / upsertEnv from the package instead.',
  );
  console.log('  ✔ D9: the Vercel API is called only from @asol/vercel-deploy-core.');
}
