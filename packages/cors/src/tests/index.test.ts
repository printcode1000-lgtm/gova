import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  ANY_ORIGIN,
  BROWSER_REQUEST_HEADERS,
  BROWSER_REQUEST_METHODS,
  CORS_ORIGINS_ENV_KEY,
  CREDENTIALS_WITH_UNVERIFIED_ORIGIN,
  DEVELOPMENT_ORIGINS,
  PREFLIGHT_MAX_AGE_SECONDS,
  allowOrigins,
  allowsAnyOrigin,
  anyOrigin,
  corsOriginsFromEnv,
  createCorsPolicy,
  handleCorsPreflight,
  isCorsPreflight,
  isOriginAllowed,
  parseAllowedOrigins,
  reflectRequestOrigin,
  requestOrigin,
  resolveCorsHeaders,
  setCorsHeaders,
  withAllowedMethods,
  withCorsHeaders,
} from '../index';

const ROOT = process.cwd();
const PACKAGE_ROOT = 'packages/cors';

function requestWith(origin: string | null, method = 'GET'): Request {
  return new Request('https://service.example/api/x', {
    method,
    headers: origin ? { origin } : undefined,
  });
}

// ── Door and dependency contract ────────────────────────────────────────────
//
// This package is built into six separate Vercel uploads, so a dependency here is a dependency in
// six deployments. `Request`/`Response`/`Headers` are the whole contract.
{
  const manifest = JSON.parse(
    readFileSync(path.join(ROOT, PACKAGE_ROOT, 'package.json'), 'utf8'),
  ) as { name: string; exports: Record<string, unknown>; dependencies?: Record<string, string> };
  assert.equal(manifest.name, '@asol/cors');
  assert.deepEqual(Object.keys(manifest.exports), ['.'], 'One door.');
  assert.equal(manifest.dependencies, undefined, 'This package has no dependencies.');

  for (const file of [
    'src/types.ts',
    'src/origins.ts',
    'src/env.ts',
    'src/policy.ts',
    'src/headers.ts',
    'src/preflight.ts',
    'src/apply.ts',
    'src/index.ts',
  ]) {
    const text = readFileSync(path.join(ROOT, PACKAGE_ROOT, file), 'utf8');
    for (const match of text.matchAll(/from\s+'([^']+)'/g)) {
      assert.ok(
        match[1]!.startsWith('.'),
        `${file} imports ${match[1]}; @asol/cors depends on nothing, so no cycle is possible.`,
      );
    }
  }
}

// ── Origin parsing ──────────────────────────────────────────────────────────
assert.deepEqual(parseAllowedOrigins(undefined), []);
assert.deepEqual(parseAllowedOrigins(''), []);
assert.deepEqual(
  parseAllowedOrigins(' https://a.example , https://b.example ,, '),
  ['https://a.example', 'https://b.example'],
  'Whitespace is trimmed and empty entries dropped — a trailing comma is not an allowed origin.',
);
assert.deepEqual(parseAllowedOrigins('*'), [ANY_ORIGIN]);
assert.equal(allowsAnyOrigin(['https://a.example', ANY_ORIGIN]), true);
assert.equal(allowsAnyOrigin(['https://a.example']), false);

// Exact comparison, never prefix or suffix.
assert.equal(isOriginAllowed('https://app.example', ['https://app.example']), true);
assert.equal(isOriginAllowed('https://app.example.evil.tld', ['https://app.example']), false);
assert.equal(isOriginAllowed('https://evil.tld/https://app.example', ['https://app.example']), false);
assert.equal(isOriginAllowed(null, ['https://app.example']), false, 'No origin is not an allowed origin.');
assert.equal(isOriginAllowed(null, [ANY_ORIGIN]), true);

// ── Environment adapter ─────────────────────────────────────────────────────
assert.equal(CORS_ORIGINS_ENV_KEY, 'ASOL_CORS_ORIGINS');
assert.deepEqual(corsOriginsFromEnv({}), [], 'An unset variable allows nothing by default.');
assert.deepEqual(
  corsOriginsFromEnv({ ASOL_CORS_ORIGINS: '' }, [ANY_ORIGIN]),
  [ANY_ORIGIN],
  'An empty value takes the caller-stated fallback, not an empty allow-list.',
);
assert.deepEqual(
  corsOriginsFromEnv({ ASOL_CORS_ORIGINS: 'https://a.example' }, DEVELOPMENT_ORIGINS),
  ['https://a.example'],
  'A configured value replaces the fallback entirely; it never merges.',
);
for (const origin of ['capacitor://localhost', 'https://localhost', 'ionic://localhost']) {
  assert.ok(
    DEVELOPMENT_ORIGINS.includes(origin),
    `DEVELOPMENT_ORIGINS dropped ${origin}; every native shell build on a developer machine speaks from one of these.`,
  );
}

// ── Policy invariants: no wildcard or reflected origin with credentials ─────
//
// The browser enforces this too, but far too late to diagnose: the response is simply discarded
// and the cause appears only as a console message in someone else's browser.
for (const origins of [anyOrigin(), reflectRequestOrigin(), allowOrigins([ANY_ORIGIN])]) {
  assert.throws(
    () => createCorsPolicy({ origins, credentials: true }),
    new RegExp(CREDENTIALS_WITH_UNVERIFIED_ORIGIN),
    'A credentialed response may not be granted to an origin that was never verified.',
  );
}
{
  const credentialed = createCorsPolicy({
    origins: allowOrigins(['https://app.example']),
    methods: ['GET', 'OPTIONS'],
    headers: BROWSER_REQUEST_HEADERS,
    credentials: true,
  });
  const headers = resolveCorsHeaders(credentialed, requestWith('https://app.example'));
  assert.equal(headers['Access-Control-Allow-Credentials'], 'true');
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://app.example');
  assert.notEqual(headers['Access-Control-Allow-Origin'], ANY_ORIGIN);
}

// No ASOL surface enables credentials, and that is what makes echoing an origin safe.
{
  const reflect = createCorsPolicy({ origins: reflectRequestOrigin() });
  assert.equal(reflect.credentials, false, 'Credentials are off unless a caller asks for them.');
  assert.equal(
    resolveCorsHeaders(reflect, requestWith('https://anywhere.example'))[
      'Access-Control-Allow-Credentials'
    ],
    undefined,
  );
}

// ── Defaults ────────────────────────────────────────────────────────────────
{
  const policy = createCorsPolicy({ origins: anyOrigin() });
  assert.equal(policy.maxAgeSeconds, PREFLIGHT_MAX_AGE_SECONDS);
  assert.deepEqual(policy.methods, [], 'A surface that answers no preflight advertises no methods.');
  const headers = resolveCorsHeaders(policy);
  assert.equal(headers['Access-Control-Allow-Methods'], undefined);
  assert.equal(headers['Access-Control-Allow-Headers'], undefined);
  assert.equal(headers['Access-Control-Max-Age'], String(PREFLIGHT_MAX_AGE_SECONDS));

  const noMaxAge = resolveCorsHeaders(createCorsPolicy({ origins: anyOrigin(), maxAgeSeconds: null }));
  assert.equal(noMaxAge['Access-Control-Max-Age'], undefined, 'null omits the header.');
}

// ── Methods and headers ─────────────────────────────────────────────────────
{
  const policy = createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: BROWSER_REQUEST_METHODS,
    headers: BROWSER_REQUEST_HEADERS,
    exposeHeaders: ['ETag'],
  });
  const headers = resolveCorsHeaders(policy, requestWith('https://app.example'));
  assert.equal(
    headers['Access-Control-Allow-Methods'],
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
  );
  assert.equal(
    headers['Access-Control-Allow-Headers'],
    'Content-Type, Authorization, Accept, X-Asol-Session-Token, X-Asol-Trace-Id',
  );
  assert.equal(headers['Access-Control-Expose-Headers'], 'ETag');

  // A client header missing from the list is preflight-rejected, and the caller sees an
  // unreachable server rather than a CORS error. That is how a narrower mirror list surfaced.
  for (const header of ['Content-Type', 'Authorization', 'Accept', 'X-Asol-Session-Token', 'X-Asol-Trace-Id']) {
    assert.ok(BROWSER_REQUEST_HEADERS.includes(header), `BROWSER_REQUEST_HEADERS dropped ${header}.`);
  }

  const narrowed = withAllowedMethods(policy, ['GET', 'OPTIONS']);
  assert.equal(resolveCorsHeaders(narrowed, requestWith('https://app.example'))['Access-Control-Allow-Methods'], 'GET, OPTIONS');
  assert.deepEqual(policy.methods, BROWSER_REQUEST_METHODS, 'Deriving a policy does not mutate the original.');
}

// ── Reflected origin, and the request that sends none ───────────────────────
{
  const policy = createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'OPTIONS'],
    headers: BROWSER_REQUEST_HEADERS,
  });
  const echoed = resolveCorsHeaders(policy, requestWith('https://app.example'));
  assert.equal(echoed['Access-Control-Allow-Origin'], 'https://app.example');
  assert.equal(echoed.Vary, 'Origin', 'Echoing an origin without Vary poisons shared caches.');

  const noOrigin = resolveCorsHeaders(policy, requestWith(null));
  assert.equal(noOrigin['Access-Control-Allow-Origin'], ANY_ORIGIN, 'A request without an origin still answers.');
  assert.equal(noOrigin.Vary, 'Origin');

  assert.equal(requestOrigin(requestWith('https://app.example')), 'https://app.example');
  assert.equal(requestOrigin(requestWith(null)), null);
  assert.equal(requestOrigin(null), null);
}

// ── Allow-list: production origins, rejection, and Vary ─────────────────────
{
  const production = createCorsPolicy({
    origins: allowOrigins(['https://gova-swart.vercel.app', 'https://app.example']),
    methods: BROWSER_REQUEST_METHODS,
    headers: BROWSER_REQUEST_HEADERS,
  });

  const allowed = resolveCorsHeaders(production, requestWith('https://gova-swart.vercel.app'));
  assert.equal(allowed['Access-Control-Allow-Origin'], 'https://gova-swart.vercel.app');
  assert.equal(allowed.Vary, 'Origin');

  const rejected = resolveCorsHeaders(production, requestWith('https://gova-swart.vercel.app.evil.tld'));
  assert.equal(rejected['Access-Control-Allow-Origin'], undefined, 'An unknown origin is never granted.');
  assert.equal(
    rejected.Vary,
    'Origin',
    'A refusal is origin-dependent too; a cache that stored it without Vary would refuse an allowed origin.',
  );
  assert.equal(rejected['Access-Control-Allow-Methods'], 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');

  const missing = resolveCorsHeaders(production, requestWith(null));
  assert.equal(missing['Access-Control-Allow-Origin'], undefined, 'Exact-origin mode invents no permission for a request with no origin.');

  // `ASOL_CORS_ORIGINS=*` is an explicit wildcard, answered as `*` rather than by reflecting
  // whatever asked — and the answer is then identical for every caller, so it does not vary.
  const wildcardList = createCorsPolicy({
    origins: allowOrigins(corsOriginsFromEnv({ ASOL_CORS_ORIGINS: '*' })),
    methods: BROWSER_REQUEST_METHODS,
    headers: BROWSER_REQUEST_HEADERS,
  });
  const wildcard = resolveCorsHeaders(wildcardList, requestWith('https://random.example'));
  assert.equal(wildcard['Access-Control-Allow-Origin'], ANY_ORIGIN);
  assert.equal(wildcard.Vary, undefined);
  assert.equal(resolveCorsHeaders(createCorsPolicy({ origins: anyOrigin() })).Vary, undefined);
}

// ── Preflight ───────────────────────────────────────────────────────────────
{
  const policy = createCorsPolicy({
    origins: allowOrigins(['https://app.example']),
    methods: ['GET', 'DELETE', 'OPTIONS'],
    headers: BROWSER_REQUEST_HEADERS,
  });

  assert.equal(isCorsPreflight(requestWith(null, 'OPTIONS')), true);
  assert.equal(isCorsPreflight(requestWith(null, 'GET')), false);

  const allowed = handleCorsPreflight(policy, requestWith('https://app.example', 'OPTIONS'));
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example');
  assert.equal(allowed.headers.get('access-control-allow-methods'), 'GET, DELETE, OPTIONS');
  assert.equal(allowed.headers.get('vary'), 'Origin');

  // A 204 is not by itself a passing preflight: without the origin header the browser refuses to
  // send the real request, and the caller sees a network outage for a server that is up.
  const refused = handleCorsPreflight(policy, requestWith('https://evil.tld', 'OPTIONS'));
  assert.equal(refused.status, 204);
  assert.equal(refused.headers.get('access-control-allow-origin'), null);

  // Preflight and real response are the same decision, built from the same policy.
  for (const origin of ['https://app.example', 'https://evil.tld', null]) {
    const preflight = handleCorsPreflight(policy, requestWith(origin, 'OPTIONS'));
    const actual = resolveCorsHeaders(policy, requestWith(origin));
    assert.equal(
      preflight.headers.get('access-control-allow-origin'),
      actual['Access-Control-Allow-Origin'] ?? null,
      `preflight and response disagree about ${origin ?? 'a request with no origin'}`,
    );
    assert.equal(
      preflight.headers.get('access-control-allow-headers'),
      actual['Access-Control-Allow-Headers'] ?? null,
    );
  }
}

// ── Applying to an existing response ────────────────────────────────────────
{
  const policy = createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'OPTIONS'],
    headers: BROWSER_REQUEST_HEADERS,
  });
  const request = requestWith('https://app.example');

  const wrapped = withCorsHeaders(Response.json({ a: 1 }, { status: 201 }), policy, request);
  assert.equal(wrapped.status, 201, 'withCorsHeaders preserves the status it wraps.');
  assert.equal(wrapped.headers.get('content-type'), 'application/json');
  assert.equal(wrapped.headers.get('access-control-allow-origin'), 'https://app.example');

  // An error response carries CORS too, or the browser reports a CORS failure instead of the
  // error the surface actually returned.
  const errored = withCorsHeaders(Response.json({ error: 'notFound' }, { status: 404 }), policy, request);
  assert.equal(errored.status, 404);
  assert.equal(errored.headers.get('access-control-allow-origin'), 'https://app.example');

  const headers = new Headers({ 'Access-Control-Allow-Origin': 'https://narrower.example' });
  setCorsHeaders(headers, policy, request, { overwrite: false });
  assert.equal(
    headers.get('access-control-allow-origin'),
    'https://narrower.example',
    'A boundary must not widen a decision a route already made.',
  );
  assert.equal(headers.get('access-control-allow-methods'), 'GET, OPTIONS', 'Headers the route left unset are still filled.');

  setCorsHeaders(headers, policy, request);
  assert.equal(headers.get('access-control-allow-origin'), 'https://app.example', 'Overwrite is the default.');
}

console.log(
  '@asol/cors: 1 door, zero dependencies, exact-origin comparison, no wildcard with credentials, preflight and response from one policy.',
);
