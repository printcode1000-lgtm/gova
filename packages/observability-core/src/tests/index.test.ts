import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  configureObservabilityCore,
  isObservabilityEnabled,
  observabilityPorts,
} from '../ports';
import { DEV_TRACE_HEADER } from '../traces/dev-trace-types';
import { resolveMonitorLayer } from '../monitor/types';

const ROOT = process.cwd();
const PACKAGE = 'packages/observability-core';

// ── Doors ───────────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(ROOT, PACKAGE, 'package.json'), 'utf8')) as {
  exports: Record<string, { default?: string }>;
};
assert.deepEqual(
  Object.keys(manifest.exports),
  ['.', './dev-trace', './server'],
  'Three doors, each a distinct load-time contract: the browser monitor, the trace-header ' +
    'vocabulary alone, and the server tracing that needs node:async_hooks.',
);

// The narrow door exists because the wide one is expensive. `api-response.ts` runs in every
// service deployment; reaching the header name through the main door pulls the monitor store and
// `@asol/data-core/browser` into all six uploads, which is exactly what it did once.
const devTraceSource = readFileSync(
  path.join(ROOT, PACKAGE, 'src/traces/dev-trace-types.ts'),
  'utf8',
);
for (const match of devTraceSource.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
  assert.ok(
    match[1]!.startsWith('.'),
    `The dev-trace door must stay free of dependencies; it imports ${match[1]}.`,
  );
}
assert.ok(
  /import type \{[^}]*\} from '\.\.\/monitor\/types'/.test(devTraceSource),
  'Its only edge is a type import, which carries no runtime module with it.',
);

const apiResponse = readFileSync(path.join(ROOT, 'src/core/api/api-response.ts'), 'utf8');
assert.ok(
  apiResponse.includes("@asol/observability-core/dev-trace"),
  'src/core/api/api-response.ts must take the narrow door: it is mirrored into every deployment.',
);

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, PACKAGE, 'src', dir), { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...files(path.join(dir, entry.name)));
    else if (entry.name.endsWith('.ts')) out.push(path.join(dir, entry.name));
  }
  return out;
}

// ── The browser door must stay browser-safe ─────────────────────────────────
//
// `node:async_hooks` one hop from the main door would break every client bundle that records an
// API call, which is all of them.
const NODE_ONLY = /from\s+['"](node:|async_hooks|fs|path)/;
const browserReachable = ['monitor', 'ports'].flatMap((dir) => files(dir));
assert.ok(browserReachable.length >= 7, `Expected the monitor modules, found ${browserReachable.length}`);
for (const file of browserReachable) {
  const text = readFileSync(path.join(ROOT, PACKAGE, 'src', file), 'utf8');
  assert.ok(!NODE_ONLY.test(text), `${file} is reachable from the browser door but imports a node builtin.`);
  assert.ok(
    !/from\s+['"]\.\.\/traces\/(server-trace|trace-server-layer|drizzle-dev-logger|data-core-telemetry\.server)/.test(text),
    `${file} reaches a server-only trace module from the browser half.`,
  );
}

// ── It must not import the application ──────────────────────────────────────
const DECLARED_DOORS = new Set(['@asol/data-core/browser', '@asol/data-core/telemetry']);
for (const file of [...files('monitor'), ...files('traces'), ...files('ports'), 'index.ts', 'server.ts']) {
  const text = readFileSync(path.join(ROOT, PACKAGE, 'src', file), 'utf8');
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1]!;
    assert.ok(
      !specifier.startsWith('@/'),
      `${file} imports ${specifier}. The monitor observes the application; it must not know it. ` +
        'Everything it needs comes through src/ports.',
    );
    if (specifier.startsWith('@asol/')) {
      assert.ok(DECLARED_DOORS.has(specifier), `${file} imports undeclared door ${specifier}.`);
    }
  }
}

// ── The one port ────────────────────────────────────────────────────────────
assert.deepEqual(
  Object.keys(observabilityPorts()),
  ['isDevelopment'],
  'One port. Anything more means the monitor started depending on the application again.',
);

configureObservabilityCore({ isDevelopment: () => false });
assert.equal(isObservabilityEnabled(), false, 'Registered production: the monitor records nothing.');
configureObservabilityCore({ isDevelopment: () => true });
assert.equal(isObservabilityEnabled(), true);

// The application registers this from its composition roots. Asserted here because the default —
// on in development, off in production — is safe enough to hide a missing registration.
const browserRoot = readFileSync(path.join(ROOT, 'src/core/composition/browser-ports.ts'), 'utf8');
const serverRoot = readFileSync(path.join(ROOT, 'src/core/composition/server-ports.ts'), 'utf8');
for (const [name, source] of [['browser', browserRoot], ['server', serverRoot]] as const) {
  assert.ok(
    /configureObservabilityCore\(/.test(source),
    `The ${name} composition root no longer registers the observability port, so the monitor ` +
      'falls back to NODE_ENV and stops agreeing with the runtime context.',
  );
}

// ── Vocabulary still answers ────────────────────────────────────────────────
assert.equal(typeof DEV_TRACE_HEADER, 'string');
assert.ok(DEV_TRACE_HEADER.length > 0);
assert.equal(typeof resolveMonitorLayer, 'function');

console.log(
  `@asol/observability-core contract: 3 doors, ${browserReachable.length} browser-safe modules, one port, no application import.`,
);
