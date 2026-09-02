import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { resolveRouteOwner } from '@asol/account-bridge/routes';

/**
 * The control runtime's contract.
 *
 * Control is the only deployment holding administrative authority, so what it
 * exposes and what it can reach are both part of the contract, not incidental.
 */
const ROOT = process.cwd();
const SERVICE = path.join(ROOT, 'services', 'control');
const API = path.join(SERVICE, 'src', 'app', 'api');

function routeModules(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) routeModules(full, out);
    else if (entry.name === 'route.ts') out.push(full);
  }
  return out;
}

function pathnameOf(file: string): string {
  return `/${path.relative(path.join(SERVICE, 'src', 'app'), path.dirname(file)).split(path.sep).join('/')}`;
}

const routes = routeModules(API);
assert.ok(routes.length > 50, `only ${routes.length} control routes found; the scan is broken`);

// ── Control serves exactly what it owns ──────────────────────────────────────
//
// Every business route here must resolve to `control` in the canonical registry.
// A route that lands in this deployment but belongs to another owner is a route
// two runtimes answer, and the client bridge only ever calls one of them.
const OPERATIONAL = new Set(['/api/health', '/api/release-readiness/[revision]']);
for (const file of routes) {
  const pathname = pathnameOf(file);
  if (OPERATIONAL.has(pathname)) continue;
  const methods = readFileSync(file, 'utf8').matchAll(
    /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g,
  );
  const exported = [...methods].map((match) => match[1]!);
  assert.ok(exported.length > 0, `${pathname} exports no HTTP method`);
  for (const method of exported) {
    assert.equal(
      resolveRouteOwner(method, pathname.replace(/\[(\w+)\]/g, 'x')),
      'control',
      `${method} ${pathname} is served by control but the registry gives it to another owner`,
    );
  }
}

// ── Every control-owned canonical route exists here ──────────────────────────
//
// The mirror is only complete if nothing was left behind: a route that still
// exists only in gova would 404 after the compatibility boundary redirects it.
const canonicalApi = path.join(ROOT, 'src', 'app', 'api');
const missing: string[] = [];
for (const file of routeModules(canonicalApi)) {
  const relative = path.relative(canonicalApi, file).split(path.sep).join('/');
  const pathname = `/api/${path.dirname(relative)}`.replace(/\[(\w+)\]/g, 'x');
  const owned = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].some(
    (method) => resolveRouteOwner(method, pathname) === 'control',
  );
  if (owned && !existsSync(path.join(API, relative))) missing.push(relative);
}
assert.deepEqual(missing, [], `control-owned routes missing from services/control: ${missing.join(', ')}`);

// ── The release barrier answers a status and nothing else ────────────────────
const barrier = readFileSync(
  path.join(API, 'release-readiness', '[revision]', 'route.ts'),
  'utf8',
);
assert.match(barrier, /\^\[0-9a-f\]\{40\}\$/, 'the barrier must require a full 40-character SHA');
assert.doesNotMatch(
  barrier,
  /logTail|snapshot|sandbox|stageHistory|exitCode|emailStatus/,
  'the barrier answers a status; deploy state belongs to the authenticated console',
);

// ── Control answers the same failures the application answers ────────────────
//
// A client moved to a new origin that maps the same error to a different status
// is a broken client, and nothing else in the suite would notice: both runtimes
// would be internally consistent and disagree with each other. Every control
// seam that turns an error into a response must go through the shared mapping.
const SEAM_ERROR_MAPPERS = [
  ['control/super-admin-route.ts', 'failure'],
  ['control/operational-route.ts', 'controlError'],
  ['control/ota-admin.ts', 'otaError'],
  ['control/system-logs.ts', 'systemLogError'],
] as const;
for (const [file, fn] of SEAM_ERROR_MAPPERS) {
  const source = readFileSync(path.join(SERVICE, 'src', file), 'utf8');
  assert.match(
    source,
    /businessApiErrorStatus/,
    `${file}'s ${fn}() must map through @/core/api/business-api-error-status, not restate statuses`,
  );
  // The two mappings had already drifted once: `forbidden` was 403 in the
  // application and 401 here, and an unrecognised error was 500 there and 400
  // here. A hardcoded status is how that comes back.
  const hardcoded = [...source.matchAll(/status:\s*(\d{3})/g)].map((match) => match[1]!);
  // `204` on operational-route.ts is the preflight, not an error: a preflight
  // carries no body and reports no failure, so it is outside the mapping's
  // domain and its status is fixed by the CORS contract, not by us.
  const allowed = new Set(
    file === 'control/system-logs.ts'
      ? ['401', '403']
      : file === 'control/operational-route.ts'
        ? ['401', '503', '204']
        : [],
  );
  for (const status of hardcoded) {
    assert.ok(
      allowed.has(status),
      `${file} hardcodes status ${status}; the shared mapping decides, except for the documented per-family exceptions`,
    );
  }
}

// ── Control is buildable on its own ──────────────────────────────────────────
for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts']) {
  assert.ok(existsSync(path.join(SERVICE, file)), `services/control/${file} is required to build`);
}

// ── Control declares its own dependencies, pinned to the audited tree ────────
const manifest = JSON.parse(readFileSync(path.join(SERVICE, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const rootLock = JSON.parse(readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')) as {
  packages: Record<string, { version?: string }>;
};
for (const [name, range] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
  const rootVersion = rootLock.packages[`node_modules/${name}`]?.version;
  assert.equal(
    range,
    rootVersion,
    `control pins ${name}@${range} but the audited tree resolves ${rootVersion ?? '(absent)'}; ` +
      'the mirrored source was reviewed against the root tree, not against a newer major.',
  );
}

console.log(`✅ control service: ${routes.length} routes, all control-owned, barrier sealed, build inputs present.`);
