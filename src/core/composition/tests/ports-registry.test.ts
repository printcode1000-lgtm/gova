import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every port seam in the application is called from a composition root.
 *
 * A seam is a module that calls a package's `configure<Name>Core(...)`. Each of those ports
 * defaults safely — telemetry no-ops, identity predicates fail closed — which is precisely why a
 * forgotten registration is invisible: the application keeps working and quietly loses the
 * behaviour. That has already happened once here, to the OTA ports during splash.
 *
 * So the rule is mechanical rather than conventional: if a file registers ports, one of the two
 * roots must call it.
 *
 * The exception is a control-owned capability. Super Admin operations belong to the control
 * runtime, and gova must not register their database, OTA-admin, or System Logs ports merely
 * because a route file exists in the repository. Those seams are listed below and get the
 * inverse rule: no composition root may call them, and a route must, so the capability is
 * reachable exactly where it is owned and nowhere else.
 */
const APP_SRC = path.join(process.cwd(), 'src');
const ROOTS = [
  'src/core/composition/browser-ports.ts',
  'src/core/composition/server-ports.ts',
  // gova's own root. It is a root and not a seam: it registers the ports a
  // frontend deployment needs and deliberately none of the business ones.
  'src/core/composition/gova-frontend-ports.ts',
];

/** Control-owned seams: registered per route, deliberately absent from both roots. */
const ROUTE_SCOPED_SEAMS = [
  'src/features/ota/server/admin.ts',
  'src/features/system-logs/server/control-persistence.server.ts',
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const rootText = ROOTS.map((rel) => readFileSync(path.join(process.cwd(), rel), 'utf8')).join('\n');
const routeText = sourceFiles(path.join(APP_SRC, 'app', 'api'))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const seams: string[] = [];
for (const file of sourceFiles(APP_SRC)) {
  const relative = path.relative(process.cwd(), file).split(path.sep).join('/');
  if (ROOTS.includes(relative) || relative.includes('/tests/')) continue;

  const content = readFileSync(file, 'utf8');
  if (!/\bconfigure[A-Z][A-Za-z]*Core\s*\(/.test(content)) continue;

  const exported = content.match(/export function (register[A-Za-z]+)\s*\(/);
  assert.ok(
    exported,
    `${relative} configures a package's ports but exports no register* function, so no root ` +
      'can call it. A seam that cannot be composed registers only for whoever imports it.',
  );
  seams.push(relative);

  if (ROUTE_SCOPED_SEAMS.includes(relative)) {
    assert.ok(
      !rootText.includes(exported[1]!),
      `${relative} is a control-owned seam, but a composition root calls ${exported[1]}(). ` +
        'That puts a control capability into the gova runtime graph; register it from its route.',
    );
    assert.ok(
      routeText.includes(exported[1]!),
      `${relative} is listed as route-scoped but no route calls ${exported[1]}(). ` +
        'A seam nothing registers is a capability that silently does nothing.',
    );
    continue;
  }

  assert.ok(
    rootText.includes(exported[1]!),
    `${relative} registers ports through ${exported[1]}(), which no composition root calls. ` +
      `Add it to one of: ${ROOTS.join(', ')} — every port here defaults safely, so a missing ` +
      'registration is silent by design.',
  );
}

assert.ok(
  seams.length >= 4,
  `Found only ${seams.length} port seams. Either the scan is broken or the convention changed — ` +
    'a check that examines nothing passes for the wrong reason.',
);

/**
 * gova's root is pinned by what it may import, not by what it happens to call.
 *
 * The whole point of a separate root is that the gova server trace contains no
 * business capability. That is a property of its imports, and an import added
 * later would otherwise be invisible: registering one more port looks harmless
 * in a diff and puts a database driver and its credentials into a frontend.
 */
const govaRoot = readFileSync(
  path.join(process.cwd(), 'src/core/composition/gova-frontend-ports.ts'),
  'utf8',
);
const govaImports = [...govaRoot.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)]
  .map((match) => match[1]!)
  .sort();
assert.deepEqual(govaImports, [
  '@/core/config',
  '@asol/observability-core',
  '@asol/observability-core/server',
]);
for (const forbidden of [
  '@asol/data-core',
  '@asol/storage-core',
  '@asol/orders-core',
  '@asol/notifications-core',
  '@asol/ota-core',
  '@asol/release-core',
  '@/features/',
]) {
  assert.ok(
    !govaRoot.includes(forbidden),
    `gova's frontend root reaches ${forbidden}; a frontend registers no business port.`,
  );
}

console.log('  ✔ gova frontend root: observability only, no business capability.');
console.log(`  ✔ composition roots: all ${seams.length} port seams registered from a root.`);
