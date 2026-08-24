/**
 * `@asol/orders-core` contract test.
 *
 * Run by `npm run test:orders-core`. Release-chain coverage is owned centrally by the generated
 * gate contract: core tests are selected into build/build:static and all test:* scripts into test.
 * This test pins that central mechanism instead of duplicating the generated command strings.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..', '..');
const SRC = path.join(PACKAGE_ROOT, 'src');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');

const manifest = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full.split(path.sep).join('/'));
  }
  return out;
}

function importsOf(file: string): string[] {
  return [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

const sourceFiles = walk(SRC);
const productionFiles = sourceFiles.filter(
  (f) => !f.includes('/tests/') && !f.endsWith('.test.ts'),
);

// ── Rule 2: one door, and it is the only one ────────────────────────────────
assert.deepEqual(
  Object.keys(manifest.exports),
  ['.'],
  'The order domain is one vocabulary with one load-time contract; a second door would mean it ' +
    'had split into two and should say which.',
);
assert.ok(
  !JSON.stringify(manifest.exports).includes('./*'),
  'A wildcard door makes every internal file importable and defeats the seal (rule 5).',
);
assert.ok(
  statSync(path.join(PACKAGE_ROOT, manifest.exports['.'].types)).isFile(),
  'The declared door points at a missing file.',
);

// ── Rule 7: zero application edges ──────────────────────────────────────────
//
// This package started with exactly one — the super-admin predicate — and it was inverted rather
// than budgeted. The count is zero and should stay zero: order logic that needs to know something
// about the application is order logic in the wrong place.
for (const file of productionFiles) {
  for (const specifier of importsOf(file)) {
    assert.ok(
      !specifier.startsWith('@/'),
      `${file} imports ${specifier}. This package has no application edges and must keep none — ` +
        'declare a port in src/ports and register it from src/features/orders/ports/orders-core-ports.ts.',
    );
    assert.ok(
      !specifier.startsWith('@asol/'),
      `${file} imports ${specifier}. The order vocabulary depends on no other package; a database ` +
        'or storage edge here would put persistence back inside the domain.',
    );
  }
}

// ── Rule 9 / purity: no node builtin, no driver, no framework ───────────────
//
// The same files run in the browser bundle, in the main app's server, and in the orders
// deployment. Anything platform-specific here would have to be duplicated or guarded in all three.
const FORBIDDEN_RUNTIME = [
  'node:fs',
  'node:path',
  'node:crypto',
  'node:child_process',
  'fs',
  'path',
  'child_process',
  'drizzle-orm',
  'better-sqlite3',
  '@libsql/client',
  'react',
  'next',
  'server-only',
];
for (const file of productionFiles) {
  for (const specifier of importsOf(file)) {
    assert.ok(
      !FORBIDDEN_RUNTIME.includes(specifier) &&
        !specifier.startsWith('node:') &&
        !specifier.startsWith('drizzle-orm/') &&
        !specifier.startsWith('@libsql/') &&
        !specifier.startsWith('next/'),
      `${file} imports ${specifier}. The order domain is pure logic: it must run unchanged in the ` +
        'browser, on the main app, and in the orders deployment.',
    );
  }
  assert.ok(
    !readFileSync(file, 'utf8').includes("import 'server-only'"),
    `${file} declares server-only. The domain is shared with the client bundle.`,
  );
}

// ── The identity port fails closed ──────────────────────────────────────────
const orders = await import('../index.ts');
orders.resetOrdersCorePorts();

assert.equal(
  orders.ordersIdentity().isSuperAdminIdentity('any-uid', 'any-phone'),
  false,
  'The default identity must fail closed. An unregistered runtime grants nobody admin rather ' +
    'than granting everybody.',
);

const unregistered = orders.actorFromInput({ uid: 'usr_x', phone: '01026546550', role: 'admin' }, 'buyer');
assert.equal(
  unregistered.role,
  'buyer',
  'With no identity registered, a client-supplied admin role must be downgraded to the fallback. ' +
    'A role string in a query parameter is not evidence of anything.',
);

orders.configureOrdersCore({
  identity: { isSuperAdminIdentity: (uid, phone) => uid === 'usr_admin' && phone === '0100' },
});
assert.equal(
  orders.actorFromInput({ uid: 'usr_admin', phone: '0100' }, 'buyer').role,
  'admin',
  'A registered identity must be honoured — both halves, uid and phone.',
);
assert.equal(
  orders.actorFromInput({ uid: 'usr_admin', phone: 'wrong' }, 'buyer').role,
  'buyer',
  'A matching uid with the wrong phone is not the super admin.',
);
assert.throws(
  () => orders.actorFromInput({ phone: '0100' }, 'buyer'),
  /userNotFound/,
  'An actor with no uid must be refused rather than defaulted.',
);
orders.resetOrdersCorePorts();

// ── Both registration points still exist ────────────────────────────────────
//
// The main app registers in `instrumentation.ts`; the orders deployment has no such entry, so
// `@asol/orders-composition` is its only registration point. Losing either one is silent — the
// port fails closed — so it is asserted here rather than discovered by an admin who cannot see
// their own orders.
const seam = readFileSync(
  path.join(REPO_ROOT, 'src/features/orders/ports/orders-core-ports.ts'),
  'utf8',
);
assert.ok(
  seam.includes('configureOrdersCore') && seam.includes('isSuperAdminIdentity'),
  'The application seam no longer registers the identity port.',
);
// Start-up registration now runs through the application's server composition root, which
// `src/instrumentation.ts` calls before the first request. Both links are asserted: a root that
// stops registering, and an instrumentation that stops calling the root, are equally silent.
assert.ok(
  readFileSync(path.join(REPO_ROOT, 'src/core/composition/server-ports.ts'), 'utf8').includes(
    'registerOrdersCorePorts',
  ),
  'The server composition root no longer registers the orders identity port.',
);
assert.ok(
  readFileSync(path.join(REPO_ROOT, 'src/instrumentation.ts'), 'utf8').includes(
    'registerAppServerPorts',
  ),
  'The main app no longer runs the server composition root at startup.',
);
assert.ok(
  readFileSync(path.join(REPO_ROOT, 'src/app/api/orders/order-api-helpers.ts'), 'utf8').includes(
    'registerOrdersCorePorts()',
  ),
  'The shared order-route helper no longer registers the identity port. It is the one module every ' +
    'order route in the main app imports, and therefore the registration that cannot be bypassed.',
);
assert.ok(
  readFileSync(path.join(REPO_ROOT, 'packages/orders-composition/src/index.ts'), 'utf8').includes(
    'configureOrdersCore',
  ),
  'The orders composition no longer registers the identity port, so the orders deployment would ' +
    'never recognise the super admin.',
);

// ── Rule 3: generated gates own release-chain coverage ──────────────────────
const rootManifest = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
assert.ok(rootManifest.scripts['test:orders-core'], 'The named orders-core test script must exist.');
assert.equal(
  rootManifest.scripts['gates:verify'],
  'npx tsx scripts/generated-gate-contract.ts',
  'Generated gate coverage must remain centrally verified.',
);
for (const [gate, entrypoint] of Object.entries({
  build: 'npx tsx scripts/run-generated-gate.ts build',
  'build:static': 'npx tsx scripts/run-generated-gate.ts build:static',
  test: 'npx tsx scripts/run-generated-gate.ts test',
})) {
  assert.equal(
    rootManifest.scripts[gate],
    entrypoint,
    `${gate} must stay behind the generated gate runner; coverage is verified by gates:verify.`,
  );
}
const generatedGateContract = readFileSync(
  path.join(REPO_ROOT, 'scripts/generated-gate-contract.ts'),
  'utf8',
);
assert.match(
  generatedGateContract,
  /const coreScripts = Object\.keys\(scripts\)\.filter\(\(name\) => \/\^test:\.\*-core\$\//,
  'The central gate contract must continue discovering every test:*-core script.',
);
assert.match(
  generatedGateContract,
  /Generated \$\{gateId\} gate does not cover core test \$\{coreScript\}/,
  'The central contract must fail when build/build:static omit a core test.',
);

console.log(
  `@asol/orders-core contract: 1 door, ${productionFiles.length} production files, ` +
    '0 app edges, identity fails closed — all green.',
);
