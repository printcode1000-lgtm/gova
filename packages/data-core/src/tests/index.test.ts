/**
 * `@asol/data-core` contract test.
 *
 * It pins the four things that make this package a seal rather than a folder: the exact set of
 * declared doors, the absence of a door onto the drivers, the safety of every telemetry
 * default, and the budget of application modules the package is still allowed to reach.
 *
 * Run by `npm run test:data-core`, which is in the `build`, `build:static`, and `test` chains —
 * rule 3 was missed three times in this repository by writing a test that gated nothing.
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

const sourceFiles = walk(SRC);
const productionFiles = sourceFiles.filter((f) => !f.includes('/tests/') && !f.endsWith('.test.ts'));

// ── Rule 2: the declared doors, pinned ──────────────────────────────────────
const EXPECTED_DOORS = [
  '.',
  './telemetry',
  './core',
  './browser',
  './provisioning',
  './tooling',
  './account-deletion',
  './advertisements',
  './auth',
  './data-health',
  './dev-cloud-backup',
  './feature-flags',
  './follow',
  './marketplace-orders',
  './notifications',
  './ota',
  './password-recovery',
  './pharmacy-profile-catalog',
  './product',
  './product-search',
  './profile',
  './seller-discounts',
  './super-admin',
  './system-logs',
  './auth/entities',
  './follow/entities',
  './pharmacy-profile-catalog/entities',
  './product/entities',
  './product-search/entities',
  './profile/entities',
  './seller-discounts/entities',
  './runtime-config',
  './product-search-fields',
];

assert.deepEqual(
  Object.keys(manifest.exports).sort(),
  [...EXPECTED_DOORS].sort(),
  'The door set changed. A new domain door is fine; an undeclared one is not — update this list deliberately.',
);

assert.ok(
  !JSON.stringify(manifest.exports).includes('./*'),
  'A wildcard door makes every internal file importable and defeats the seal (rule 5).',
);

for (const [door, entry] of Object.entries(manifest.exports) as [string, { types: string }][]) {
  const target = path.join(PACKAGE_ROOT, entry.types);
  assert.ok(statSync(target).isFile(), `Door ${door} points at a missing file: ${entry.types}`);
}

// ── One door per domain, and no barrel across domains ───────────────────────
const domainDirs = readdirSync(path.join(SRC, 'domains'));
for (const domain of domainDirs) {
  assert.ok(
    Object.keys(manifest.exports).includes(`./${domain}`),
    `Domain ${domain} has no declared door, so nothing can reach it.`,
  );
}

const rootDoorSource = readFileSync(path.join(SRC, 'index.ts'), 'utf8');
assert.ok(
  !rootDoorSource.includes('./domains/'),
  'The root door must never re-export a domain. A barrel mirrors every domain schema into any ' +
    'deployment that imports it — the failure already recorded for the account-declarations barrel.',
);

// ── The drivers have no door at all ─────────────────────────────────────────
const doorTargets = new Set(
  (Object.values(manifest.exports) as { types: string }[]).map((e) =>
    path.join(PACKAGE_ROOT, e.types).split(path.sep).join('/'),
  ),
);
for (const target of doorTargets) {
  assert.ok(
    !target.includes('/src/core/database/'),
    `A door points into src/core/database (${target}). drizzle-orm, @libsql/client and ` +
      'better-sqlite3 are reachable only from inside this package, and that is the whole seal.',
  );
}

// ── Rule 4/9: the browser door must never reach a node builtin ──────────────
function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function closureFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of importsOf(file)) {
      if (!specifier.startsWith('.')) continue;
      const base = path.posix.join(path.posix.dirname(file.split(path.sep).join('/')), specifier);
      for (const ext of ['.ts', '.tsx', '/index.ts']) {
        try {
          if (statSync(base + ext).isFile()) {
            stack.push(base + ext);
            break;
          }
        } catch {
          /* try the next extension */
        }
      }
    }
  }
  return seen;
}

const browserClosure = closureFrom(path.join(SRC, 'browser', 'index.ts'));
for (const file of browserClosure) {
  for (const specifier of importsOf(file)) {
    assert.ok(
      !specifier.startsWith('node:') &&
        !['fs', 'path', 'crypto', 'child_process'].includes(specifier),
      `The browser door reaches a node builtin through ${file} (${specifier}). That import ends ` +
        'up in the shipped web bundle.',
    );
    assert.ok(
      !['drizzle-orm', 'better-sqlite3', '@libsql/client'].includes(specifier) &&
        !specifier.startsWith('drizzle-orm/') &&
        !specifier.startsWith('@libsql/'),
      `The browser door reaches a server database driver through ${file} (${specifier}).`,
    );
  }
}

// ── Rule 7 (reverse): every telemetry default is safe ───────────────────────
const telemetry = await import('../ports/telemetry.ts');
telemetry.resetDataCoreTelemetry();

const marker = Symbol('untouched');
assert.equal(telemetry.dataCoreTelemetry().isEnabled(), false, 'Telemetry must default to off.');
assert.equal(
  telemetry.createDrizzleDevLogger(),
  undefined,
  'The default query logger must be absent, not a stub that allocates on every statement.',
);
assert.equal(
  await telemetry.traceServerLayer('query-command', 'unregistered', async () => marker),
  marker,
  'With nothing registered, traceServerLayer must run the action and return its value untouched.',
);
assert.equal(
  await telemetry.traceDatabaseQuery(
    { driver: 'SQLite-Dev', sql: 'SELECT 1', params: [], table: '' },
    async () => marker,
  ),
  marker,
  'With nothing registered, a query must still run. A forgotten registration costs trace lines, never data.',
);
assert.equal(
  await telemetry.traceBrowserDatabaseOperation('cache', 'k', 'get', async () => marker),
  marker,
  'With nothing registered, an IndexedDB read must still run.',
);

await assert.rejects(
  telemetry.traceDatabaseQuery(
    { driver: 'SQLite-Dev', sql: 'SELECT 1', params: [], table: '' },
    async () => {
      throw new Error('boom');
    },
  ),
  /boom/,
  'The default must propagate the original failure rather than swallowing it.',
);

// ── Rule 7: the application edges this package is allowed to keep ───────────
/**
 * Each entry is a module in `src/` that `@asol/data-core` still imports, and the reason it is
 * layering rather than a violation. Driving the count to zero was never the goal; naming which
 * edges are real is. **This list should only ever shrink.**
 */
const ALLOWED_APP_EDGES = new Set<string>([
  // Empty: capability production sources must not import `@/`. Remaining
  // runtime/config/catalog needs are registered via ports under `src/ports/`.
]);

/**
 * Sealed packages this one may reach, and only through a declared door. The order vocabulary
 * used to be eight `@/modules/marketplace-orders/*` app edges; it is now one door on
 * `@asol/orders-core`, which is a layer-1 → layer-1 edge rather than knowledge of the app.
 */
const DECLARED_PACKAGE_DOORS = new Set([
  // The database adapter implements backup-core's port without giving backup-core a data driver.
  '@asol/backup-core',
  // Shared cleanup vocabulary and policy. The runtime fact is supplied by a local adapter.
  '@asol/data-health-core',
  '@asol/data-health-core/server',
  // Advertisement feature contracts now live in sealed UI-core packages.
  '@asol/hero-slider-core',
  '@asol/trending-ribbon-core',
  '@asol/featured-marquee-core',
  // The storage profile file is owned by the package that validates it, not by the application.
  '@asol/storage-core/profiles-config',
  // Reading rules only. Which keys this package needs stays here; what "unset" means does not.
  '@asol/env-core/files',
  '@asol/orders-core',
  '@asol/auth-core',
  '@asol/auth-core/server',
  '@asol/dev-core',
  '@asol/dev-core/server',
  '@asol/notifications-core',
  '@asol/ota-core',
  '@asol/product-core',
  '@asol/product-core/server',
  '@asol/storage-core',
  '@asol/storage-core/server',
  '@asol/system-logs-core',
  '@asol/system-logs-core/server',
]);

/** Inverted into `src/ports/telemetry.ts`. Re-importing one of these must fail loudly. */
/**
 * The developer monitor, which this package must never import.
 *
 * It used to reach five modules under `src/core/monitor/` directly. Those now live in
 * `@asol/observability-core`, and the direction is inverted: this package announces what it did
 * through `src/ports/telemetry.ts`, and the application registers a recorder. Moving the monitor
 * into a package of its own does not make importing it acceptable — a data layer that knows how
 * it is being observed is the coupling the port removed.
 */
const INVERTED_PACKAGE_DOORS = ['@asol/observability-core', '@asol/observability-core/server'];

const seenEdges = new Set<string>();
for (const file of productionFiles) {
  for (const specifier of importsOf(file)) {
    if (!specifier.startsWith('@/')) continue;
    seenEdges.add(specifier);
    assert.ok(
      ALLOWED_APP_EDGES.has(specifier),
      `${file} adds a new application edge: ${specifier}. This budget should only shrink — if the ` +
        'edge is genuinely layering, add it here with the reason it is not a violation.',
    );
  }
}

const seenDoors = new Set<string>();
for (const file of productionFiles) {
  for (const specifier of importsOf(file)) {
    if (!specifier.startsWith('@asol/') || specifier.startsWith('@asol/data-core')) continue;
    seenDoors.add(specifier);
    assert.ok(
      !INVERTED_PACKAGE_DOORS.includes(specifier),
      `${file} imports ${specifier}, which was deliberately inverted into src/ports/telemetry.ts. ` +
        'Register a recorder from the application seam instead of importing the monitor here.',
    );
    assert.ok(
      DECLARED_PACKAGE_DOORS.has(specifier),
      `${file} imports ${specifier}, which is not a declared package door. A door that resolves ` +
        'is not the same as a door this package agreed to depend on.',
    );
  }
}

for (const edge of ALLOWED_APP_EDGES) {
  assert.ok(
    seenEdges.has(edge),
    `${edge} is budgeted but no longer imported. Delete the entry — a budget that overstates the ` +
      'edges hides the next one that is added.',
  );
}

// ── Runtime require resolves only package specifiers ────────────────────────
//
// `nodeRequire` is `createRequire`: a real Node resolution performed at runtime, not a
// bundler edge. This package ships TypeScript sources, so a relative specifier has no
// extension for Node to resolve and throws `Cannot find module` on the first query —
// which is exactly how every data source went down after the move to ESM. Relative
// modules belong in a static `import`; `nodeRequire` is for `node_modules` only.
const rootNextConfig = readFileSync(path.join(REPO_ROOT, 'next.config.ts'), 'utf8');
assert.match(
  rootNextConfig,
  /serverExternalPackages:\s*\[[^\]]*['"]drizzle-orm['"]/,
  'next.config.ts must list drizzle-orm in serverExternalPackages so drizzle-orm/libsql can resolve on Vercel.',
);
assert.match(
  rootNextConfig,
  /outputFileTracingIncludes:\s*\{[\s\S]*drizzle-orm\/libsql/,
  'next.config.ts must trace drizzle-orm/libsql for lazy Turso adapters on Vercel.',
);
assert.match(
  readFileSync(path.join(REPO_ROOT, 'packages/data-core/src/core/database/drizzle-libsql.server.ts'), 'utf8'),
  /from 'drizzle-orm\/libsql'/,
  'Turso drizzle adapters must import libsql statically through drizzle-libsql.server.ts.',
);

const RUNTIME_REQUIRE = /(?:^|[^\w$.])[\w$]*[Rr]equire\s*\(\s*['"](\.[^'"]*)['"]\s*\)/g;
for (const file of productionFiles) {
  const source = readFileSync(file, 'utf8');
  RUNTIME_REQUIRE.lastIndex = 0;
  const match = RUNTIME_REQUIRE.exec(source);
  assert.ok(
    match === null,
    `${file} passes the relative specifier '${match?.[1]}' to a runtime require(). Node cannot ` +
      'resolve a TypeScript source without an extension — import the module statically instead.',
  );
}

// ── Rule 3: the gate is wired into the release chains ───────────────────────
const rootManifest = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
for (const chain of ['build', 'build:static', 'test']) {
  assert.ok(
    rootManifest.scripts[chain].includes('test:data-core'),
    `test:data-core is missing from the ${chain} chain. A test that does not gate the release ` +
      'does not satisfy rule 3.',
  );
}

console.log(
  `@asol/data-core contract: ${Object.keys(manifest.exports).length} doors, ` +
    `${productionFiles.length} production files, ${seenEdges.size} budgeted app edges, ` +
    `${seenDoors.size} package doors — all green.`,
);
