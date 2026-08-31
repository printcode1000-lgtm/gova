import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import {
  ACCOUNT_DECLARATIONS,
  GOVA_DECLARATION,
  NOTIFICATIONS_DECLARATION,
  PRODUCTS_DECLARATION,
  ORDERS_DECLARATION,
  PROFILES_DECLARATION,
  SUBMAIN_DECLARATION,
  SUB2MAIN_DECLARATION,
} from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const PACKAGE_ROOT = path.join(process.cwd(), 'packages/account-declarations/src');
const APPLICATION_ROOT = path.join(process.cwd(), 'src');
const CANONICAL_FEATURE_ROOT_CHILDREN = new Set([
  'domain',
  'application',
  'infrastructure',
  'presentation',
  'ports',
  'server',
  'tests',
  'index.ts',
  'ui.ts',
  'server.ts',
]);

function allSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests') out.push(...allSourceFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The env key counts recorded before the packaging migration began. They are the
 * credential-isolation boundary: a key appearing on an account that lacked it is a
 * privilege leak, not a refactor.
 */
const EXPECTED_KEY_COUNTS: Record<string, number> = {
  notifications: 11,
  products: 13,
  orders: 18,
  profiles: 21,
};

function runTests(): void {
  console.log('🧪 Running @asol/account-declarations tests...\n');

  // ---------------------------------------------------------------- pure data
  // The contract that lets a composition depend on this package without dragging the
  // deploy engine — child_process, fs, Vercel tokens — into a service deployment.
  const files = allSourceFiles(PACKAGE_ROOT);
  assert(files.length > 0, 'source files found');
  for (const file of files) {
    // Comments are stripped first: this file's own doc block explains why the deploy
    // engine must stay out, and a naive scan flagged that explanation as the violation.
    const content = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const specifiers = [...content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const specifier of specifiers) {
      assert(
        specifier.startsWith('./') || specifier.startsWith('../'),
        `${path.basename(file)} imports "${specifier}" — this package must import nothing outside itself`,
      );
    }
    assert(
      !/\b(require|child_process|node:fs|node:child_process)\b/.test(content),
      `${path.basename(file)} references a node capability; declarations are pure data`,
    );
  }
  console.log('  ✔ Pure data: no import leaves the package, no node capability referenced.');

  // ---------------------------------------------------------------- shape
  for (const [name, declaration] of Object.entries(ACCOUNT_DECLARATIONS)) {
    assert(declaration.name === name, `${name}: name matches its registry key`);
    assert(declaration.project.length > 0, `${name}: has a project`);
    assert(declaration.tokenEnvVar.startsWith('VERCEL_'), `${name}: token var is a Vercel token`);
  }
  console.log('  ✔ All eight declarations are well-formed.');

  // ---------------------------------------------------------------- mirror entry points are real and canonical
  for (const declaration of Object.values(ACCOUNT_DECLARATIONS)) {
    for (const entryPoint of declaration.mirrorEntryPoints) {
      const absolute = path.join(APPLICATION_ROOT, entryPoint);
      assert(
        existsSync(absolute),
        `${declaration.name}: mirror entry point does not exist: src/${entryPoint}`,
      );
      const parts = entryPoint.split('/');
      if (parts[0] === 'features') {
        const rootChild = parts[2];
        assert(
          Boolean(rootChild && CANONICAL_FEATURE_ROOT_CHILDREN.has(rootChild)),
          `${declaration.name}: mirror entry point bypasses canonical feature layers: src/${entryPoint}`,
        );
      }
    }
  }
  console.log('  ✔ Every mirror entry point exists and uses canonical feature layers.');

  // ---------------------------------------------------------------- credential isolation
  for (const declaration of [
    NOTIFICATIONS_DECLARATION,
    PRODUCTS_DECLARATION,
    ORDERS_DECLARATION,
    PROFILES_DECLARATION,
  ]) {
    const total = declaration.requiredEnv.length + declaration.optionalEnv.length;
    const expected = EXPECTED_KEY_COUNTS[declaration.name];
    assert(
      total === expected,
      `${declaration.name}: expected ${expected} env keys, found ${total}. ` +
        `A changed count is a credential-isolation change and must be justified, not absorbed.`,
    );
    const overlap = declaration.requiredEnv.filter((key) => declaration.optionalEnv.includes(key));
    assert(overlap.length === 0, `${declaration.name}: no key is both required and optional`);
  }
  console.log('  ✔ Env key counts unchanged: 11 / 13 / 18 / 21.');

  // ---------------------------------------------------------------- no cross-account knowledge
  // Rule 0 at the data layer: a declaration may name only its own account.
  //
  // One exception, and it is an origin rather than a credential: the release
  // plane's terminal deployment notification is the single allowlisted
  // cross-deployment call, and it needs the address to post the already-signed
  // grant to. Control receives no notification database and no push provider
  // credential for it — the notifications runtime stays the delivery owner — so
  // the rule below still catches a real notifications secret landing here.
  const CROSS_ACCOUNT_ORIGIN_ALLOWLIST = new Set(['ASOL_NOTIFICATIONS_URL']);
  const isolatedServiceNames = ['notifications', 'products', 'orders', 'profiles'] as const;
  for (const declaration of Object.values(ACCOUNT_DECLARATIONS)) {
    if (declaration.name === 'gova' || declaration.name === 'submain' || declaration.name === 'sub2main') continue;
    const keys = [...declaration.requiredEnv, ...declaration.optionalEnv]
      .filter((key) => !CROSS_ACCOUNT_ORIGIN_ALLOWLIST.has(key));
    for (const other of isolatedServiceNames) {
      if (other === declaration.name) continue;
      const foreign = keys.filter((key) => key.includes(other.toUpperCase()));
      assert(
        foreign.length === 0,
        `${declaration.name} holds ${other} credentials: ${foreign.join(', ')}`,
      );
      assert(
        declaration.tokenEnvVar !== `VERCEL_${other.toUpperCase()}_TOKEN`,
        `${declaration.name} uses ${other}'s Vercel token`,
      );
    }
  }
  console.log('  ✔ No declaration references another account.');

  // ---------------------------------------------------------------- gova is verification-only
  assert(GOVA_DECLARATION.serviceDir === undefined, 'gova has no serviceDir: it is the whole repo');
  assert(GOVA_DECLARATION.mirrorEntryPoints.length === 0, 'gova has no mirror');
  assert(SUBMAIN_DECLARATION.serviceDir === 'services/submain', 'submain deploys from services/submain');
  assert(SUBMAIN_DECLARATION.deployFromRepositoryRoot === undefined, 'submain is not a root deploy');
  assert(SUBMAIN_DECLARATION.tokenEnvVar === 'VERCEL_SUBMAIN_TOKEN', 'submain token var');
  assert(
    !SUBMAIN_DECLARATION.requiredEnv.some((key) => key.startsWith('VERCEL_')),
    'submain runtime env must not include deploy tokens',
  );
  assert(SUB2MAIN_DECLARATION.serviceDir === 'services/sub2main', 'sub2main deploys from services/sub2main');
  assert(SUB2MAIN_DECLARATION.deployFromRepositoryRoot === undefined, 'sub2main is not a root deploy');
  assert(SUB2MAIN_DECLARATION.tokenEnvVar === 'VERCEL_SUB2MAIN_TOKEN', 'sub2main token var');
  assert(
    !SUB2MAIN_DECLARATION.requiredEnv.some((key) => key.startsWith('VERCEL_')),
    'sub2main runtime env must not include deploy tokens',
  );
  console.log('  ✔ gova is verification-only; submain and sub2main are service deploys.');

  // ---------------------------------------------------------------- compositions stay off the engine
  // This is the regression that made layer 2 unwireable: each composition imported the
  // deploy engine to read one string.
  const compositionNames = [...isolatedServiceNames, 'submain', 'sub2main'] as const;
  for (const service of compositionNames) {
    const compositionIndex = path.join(
      process.cwd(),
      `packages/${service}-composition/src/index.ts`,
    );
    if (!existsSync(compositionIndex)) continue;
    const content = readFileSync(compositionIndex, 'utf8');
    assert(
      !content.includes('@asol/vercel-deploy-core'),
      `${service}-composition imports the deploy engine. Wiring a route through it would ` +
        `mirror child_process and the Vercel token handling into that deployment. ` +
        `Import @asol/account-declarations instead.`,
    );
  }
  console.log('  ✔ No composition imports the deploy engine.');

  console.log('\n✅ All @asol/account-declarations tests passed!\n');
}

try {
  runTests();
} catch (error) {
  console.error('❌ account-declarations test failed:', error);
  process.exit(1);
}
