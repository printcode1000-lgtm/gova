import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { BROWSER_REQUEST_HEADERS, createCorsPolicy, reflectRequestOrigin } from '@asol/cors';

import {
  createServiceHttp,
  credentialHealthReport,
  errorMessageOf,
  mapErrorStatus,
  shardHealthReport,
  type ErrorStatusRule,
} from '../index';

const ROOT = process.cwd();

// ── Door contract ───────────────────────────────────────────────────────────
const manifest = JSON.parse(
  readFileSync(path.join(ROOT, 'packages/service-runtime-core/package.json'), 'utf8'),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifest.exports), ['.'], 'One door.');

// Every deployment builds this into its own bundle, so a dependency here is a dependency in six
// uploads. `Request`/`Response` are the whole contract, plus `@asol/cors` for headers and
// `@asol/api-contract-core/server` for the application-owned JSON transport invariant.
const ALLOWED_DEPENDENCIES = new Set(['@asol/cors', '@asol/api-contract-core/server']);
for (const file of ['domain/error-status.ts', 'domain/service-http.ts', 'domain/service-proxy.ts', 'domain/health.ts', 'index.ts']) {
  const text = readFileSync(path.join(ROOT, 'packages/service-runtime-core/src', file), 'utf8');
  for (const match of text.matchAll(/from\s+'([^']+)'/g)) {
    const specifier = match[1]!;
    assert.ok(
      specifier.startsWith('.') || ALLOWED_DEPENDENCIES.has(specifier),
      `${file} imports ${specifier}; this package depends only on ${[...ALLOWED_DEPENDENCIES].join(', ')}.`,
    );
  }
}

// CORS is not implemented here. A copy growing back in this package is how five copies existed.
for (const file of ['domain/error-status.ts', 'domain/service-http.ts', 'domain/service-proxy.ts', 'domain/health.ts', 'index.ts']) {
  const text = readFileSync(path.join(ROOT, 'packages/service-runtime-core/src', file), 'utf8');
  for (const line of text.split('\n')) {
    const code = line.trim();
    if (code.startsWith('*') || code.startsWith('//') || code.startsWith('/*')) continue;
    assert.ok(
      !/Access-Control-/i.test(code),
      `${file} writes a CORS header by hand: ${code}. @asol/cors owns every one of them.`,
    );
  }
}

// ── CORS pass-through ───────────────────────────────────────────────────────
//
// The semantics — exact-origin comparison, Vary, no wildcard with credentials, preflight and
// response agreeing — belong to @asol/cors and are tested there. What this package owns is that a
// deployment's own policy reaches every response it builds, including its error responses.
const http = createServiceHttp({
  cors: createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'OPTIONS'],
    headers: ['Content-Type', 'Accept'],
  }),
  defaultRules: [{ status: 404, equals: ['missing'] }],
});

const withOrigin = new Request('https://service.example/api/x', {
  headers: { origin: 'https://app.example' },
});
const headers = http.corsHeaders(withOrigin);
assert.equal(headers['Access-Control-Allow-Origin'], 'https://app.example', 'The origin is echoed.');
assert.equal(headers.Vary, 'Origin', 'Echoing an origin without Vary poisons shared caches.');
assert.equal(headers['Access-Control-Allow-Methods'], 'GET, OPTIONS');
assert.equal(
  headers['Access-Control-Allow-Credentials'],
  undefined,
  'No deployment accepts credentials — that is what makes echoing an origin safe.',
);
assert.equal(
  http.corsHeaders(new Request('https://service.example/api/x'))['Access-Control-Allow-Origin'],
  '*',
  'A request without an origin still answers.',
);

const preflight = http.preflight(withOrigin);
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://app.example');

const wrapped = http.withCors(withOrigin, Response.json({ a: 1 }, { status: 201 }));
assert.equal(wrapped.status, 201, 'withCors preserves the status it wraps.');
assert.equal(wrapped.headers.get('Access-Control-Allow-Origin'), 'https://app.example');

// ── Status mapping ──────────────────────────────────────────────────────────
const rules: readonly ErrorStatusRule[] = [
  { status: 401, equals: ['userNotFound'] },
  { status: 403, equals: ['Forbidden'], includes: ['only'] },
  { status: 404, includes: ['not found', 'notFound'] },
  { status: 400, includes: ['required', 'invalid', 'must'] },
];
assert.equal(mapErrorStatus('userNotFound', rules), 401);
assert.equal(mapErrorStatus('Forbidden', rules), 403);
assert.equal(mapErrorStatus('sellers only', rules), 403);
assert.equal(mapErrorStatus('order not found', rules), 404);
assert.equal(mapErrorStatus('phone is required', rules), 400);
assert.equal(mapErrorStatus('anything else', rules), 500, 'An unmapped message is a server error.');
assert.equal(
  mapErrorStatus('userNotFound', [{ status: 404, includes: ['NotFound'] }, { status: 401, equals: ['userNotFound'] }]),
  404,
  'First match wins — rule order is the policy, not an accident.',
);
assert.equal(mapErrorStatus('x', [{ status: 400, matches: /^x$/ }]), 400);

assert.equal(errorMessageOf(new Error('boom')), 'boom');
assert.equal(errorMessageOf('boom'), 'Internal Server Error', 'A non-Error never leaks its own text.');
assert.equal(errorMessageOf(null), 'Internal Server Error');

const errored = http.errorResponse(withOrigin, new Error('missing'));
assert.equal(errored.status, 404);
assert.throws(
  () => http.jsonResponse(withOrigin, { legacy_key: true }),
  /legacy_key/,
  'A service cannot serialize snake_case application-owned JSON.',
);
assert.equal(errored.headers.get('Access-Control-Allow-Origin'), 'https://app.example',
  'An error response carries CORS too, or the browser reports a CORS failure instead of the error.');

// ── Health ──────────────────────────────────────────────────────────────────
const shards = shardHealthReport({
  service: 'asol-orders',
  shardPrefixes: ['A', 'B'],
  env: { A_DATABASE_URL: 'libsql://a' },
});
assert.deepEqual(shards, { service: 'asol-orders', ok: false, configured: { shards: 1, missing: ['B'] } });
assert.equal(
  shardHealthReport({ service: 's', shardPrefixes: ['A'], env: { A_DATABASE_URL: 'x' } }).ok,
  true,
);

const credentials = credentialHealthReport({
  service: 'asol-products',
  credentials: { productDatabase: 'libsql://secret-token@host', missingOne: undefined },
});
assert.deepEqual(credentials.configured, { productDatabase: true, missingOne: false });
assert.equal(credentials.ok, true, 'A missing optional credential degrades a feature, not the service.');
assert.equal(
  JSON.stringify(credentials).includes('secret-token'),
  false,
  'A health body reports presence and never the value — this endpoint is public.',
);
assert.equal(
  credentialHealthReport({ service: 's', credentials: { a: undefined }, requireAll: true }).ok,
  false,
);

// ── Every deployment actually uses it ───────────────────────────────────────
//
// The point of this package is that six copies stop existing. Without this check they could
// quietly come back one route at a time, and the package would keep passing its own tests.
const servicesRoot = path.join(ROOT, 'services');
const deployments = readdirSync(servicesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
assert.ok(deployments.length >= 6, `Expected the service deployments, found ${deployments.length}`);

for (const name of deployments) {
  const healthRoute = path.join(servicesRoot, name, 'src/app/api/health/route.ts');
  const health = readFileSync(healthRoute, 'utf8');
  assert.ok(
    health.includes('@asol/service-runtime-core'),
    `services/${name}'s health route builds its own response instead of using the shared one.`,
  );

  const httpFile = path.join(servicesRoot, name, 'src/app/lib/http.ts');
  let httpSource: string;
  try {
    httpSource = readFileSync(httpFile, 'utf8');
  } catch {
    continue; // notifications answers one write route and has no read helper file.
  }
  assert.ok(
    httpSource.includes('createServiceHttp'),
    `services/${name}/src/app/lib/http.ts hand-rolls its HTTP helpers again.`,
  );
  assert.ok(
    !httpSource.includes('Access-Control-Allow-Origin'),
    `services/${name} writes CORS headers by hand. That is what drifted across five copies.`,
  );
}

// ── One request-header list, three places that answer with it ───────────────
//
// A mirror that advertises fewer request headers than the main application does not answer less:
// the browser's preflight rejects the call before it is sent, and the client reports an
// unreachable server. `asol-profiles` answered `Content-Type, Accept` while the app answered five
// headers, and the failure arrived as "Unable to reach the server" with no CORS wording anywhere.
// So the constant is the only permitted spelling in these three files.
for (const header of ['Content-Type', 'Authorization', 'Accept', 'X-Asol-Session-Token', 'X-Asol-Trace-Id']) {
  assert.ok(
    BROWSER_REQUEST_HEADERS.includes(header),
    `BROWSER_REQUEST_HEADERS dropped ${header}; a client that sends it would be preflight-rejected.`,
  );
}

for (const file of [
  'services/profiles/src/app/lib/http.ts',
  'src/proxy.ts',
  'next.config.ts',
]) {
  const text = readFileSync(path.join(ROOT, file), 'utf8');
  assert.ok(
    text.includes('BROWSER_REQUEST_HEADERS'),
    `${file} spells its Access-Control-Allow-Headers list by hand again.`,
  );
  assert.ok(
    !/'Content-Type,[^']*'/.test(text),
    `${file} carries a literal header list beside the shared constant.`,
  );
}

console.log(
  `@asol/service-runtime-core contract: 1 door, CORS + JSON transport delegated, ${deployments.length} deployments on the shared runtime.`,
);
