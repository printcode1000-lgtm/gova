import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import {
  redactSystemLogText,
  sanitizePersistentSystemLog,
  buildSystemLogFingerprint,
  mergeLiveAndPersistentCounts,
  configureSystemLogsCore,
  resetSystemLogsCorePorts,
  prettifyStack,
  formatExportCsv,
  groupEntriesByFingerprint,
  matchesLogQuery,
  createCorrelationId,
  markErrorAsLogged,
  isErrorAlreadyLogged,
} from '../index';
import {
  persistentSystemLogService,
  normalizeIngestPayload,
  validateIngestBatchSize,
} from '../server';
import type { SystemLogInput } from '../domain/entities';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

function runSanitizerTest() {
  const base: SystemLogInput = {
    level: 'error',
    source: 'server',
    consoleMethod: 'server.error',
    message:
      'Authorization: Bearer abc.def token=secret-value user@example.com 01012345678',
    page: '/api/test?token=page-secret',
    platform: 'server',
  };

  const client = sanitizePersistentSystemLog(base, 'untrusted-client');
  assert.equal(client.origin, 'client');
  assert.equal(client.trustLevel, 'untrusted-client');
  assert.equal(client.message.includes('abc.def'), false);
  assert.equal(client.message.includes('secret-value'), false);

  const server = sanitizePersistentSystemLog(base, 'trusted-server');
  assert.equal(server.origin, 'cloud');
  assert.equal(server.trustLevel, 'trusted-server');
  assert.equal(server.platform, 'server');

  for (const value of [
    "password='hunter2'",
    'api_key=abcdef',
    '?token=abcdef&next=/home',
    '"sessionToken":"abcdef"',
  ]) {
    assert.equal(redactSystemLogText(value).includes('abcdef'), false);
  }
  console.log('✅ system-logs-core sanitizer test passed');
}

async function runPersistencePortIntegrationTest() {
  const stored: import('../domain/entities').PersistentSystemLogEntry[] = [];
  resetSystemLogsCorePorts();
  configureSystemLogsCore({
    persistence: {
      add: async (input) => {
        const entry = {
          ...input,
          id: 'syslog-test',
          fingerprint: buildSystemLogFingerprint(input),
          occurrences: 1,
          firstOccurredAt: new Date().toISOString(),
          lastOccurredAt: new Date().toISOString(),
          messageTruncated: false,
          stackTruncated: false,
        };
        stored.unshift(entry);
        return entry.id;
      },
      addBatch: async () => undefined,
      list: async () => ({ items: stored, nextCursor: null, totalInPage: stored.length }),
      summary: async () => ({ totalErrors: stored.length, totalWarnings: 0, lastHourErrors: stored.length, topFeatures: [], topFingerprints: [], byPlatform: {} }),
      clear: async () => { stored.length = 0; },
      pruneOlderThan: async () => 0,
    },
  });
  const id = await persistentSystemLogService.add({
    level: 'error', source: 'api', consoleMethod: 'server.error',
    message: 'authorization: Bearer private-token', page: '/api/orders',
    platform: 'server', routeName: 'POST /api/orders', statusCode: 500, requestMethod: 'POST',
  });
  assert.equal(id, 'syslog-test');
  const page = await persistentSystemLogService.list({ origin: 'cloud', level: 'error' });
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0]?.trustLevel, 'trusted-server');
  assert.equal(page.items[0]?.message.includes('private-token'), false);
  resetSystemLogsCorePorts();
  console.log('✅ system-logs-core persistence port integration test passed');
}
function runFingerprintDedupTest() {
  const input: SystemLogInput = {
    level: 'error',
    source: 'client',
    consoleMethod: 'window.error',
    message: 'same',
    page: '/home',
    platform: 'web',
  };
  const a = buildSystemLogFingerprint(input);
  const b = buildSystemLogFingerprint(input);
  assert.equal(a, b);
  console.log('✅ system-logs-core fingerprint test passed');
}

function runPresentationTest() {
  const stack = prettifyStack('at webpack-internal:///(/app/page.tsx:1:1)');
  assert.equal(stack.includes('webpack-internal'), false);
  const grouped = groupEntriesByFingerprint([
    { fingerprint: 'a', id: '1' },
    { fingerprint: 'a', id: '2' },
  ] as Array<{ fingerprint: string; id: string }>);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0]?.entries.length, 2);
  assert.equal(
    matchesLogQuery(
      {
        level: 'error',
        source: 'client',
        consoleMethod: 'x',
        message: 'Payment failed',
        page: '/checkout',
        platform: 'web',
        feature: 'Orders',
      },
      'payment',
    ),
    true,
  );
  const csv = formatExportCsv([{ id: '1', message: 'a,b' }]);
  assert.ok(csv.includes('"a,b"'));
  console.log('✅ system-logs-core presentation test passed');
}

function runCorrelationTest() {
  const error = new Error('boom');
  assert.equal(isErrorAlreadyLogged(error), false);
  markErrorAsLogged(error);
  assert.equal(isErrorAlreadyLogged(error), true);
  console.log('✅ system-logs-core correlation test passed');
}

function runIngestValidationTest() {
  const payload = normalizeIngestPayload({ message: 123 });
  assert.equal(typeof payload.message, 'string');
  assert.equal(validateIngestBatchSize([{}]), null);
  assert.equal(validateIngestBatchSize(new Array(30).fill({})), 'systemLogBatchTooLarge');
  console.log('✅ system-logs-core ingest validation test passed');
}

function runCountMergeTest() {
  const count = mergeLiveAndPersistentCounts(
    2,
    [
      { level: 'error', fingerprint: 'live', occurrences: 3 },
      { level: 'error', fingerprint: 'persisted', occurrences: 1 },
    ],
    new Set(['live']),
  );
  assert.equal(count, 3);
  console.log('✅ system-logs-core count merge test passed');
}

function runPackageSealTest() {
  const pkg = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'packages/system-logs-core/package.json'), 'utf8'),
  );
  assert.equal(pkg.exports['./*'], undefined);
  assert.ok(pkg.exports['.']);
  assert.ok(pkg.exports['./server']);
  console.log('✅ system-logs-core package seal test passed');
}

import { runScenarioCoverageTest } from './scenario-coverage.test';

async function main() {
  console.log('🚀 Running @asol/system-logs-core test suite...\n');
  runSanitizerTest();
  runFingerprintDedupTest();
  runPresentationTest();
  runCorrelationTest();
  runIngestValidationTest();
  runCountMergeTest();
  runPackageSealTest();
  runScenarioCoverageTest();
  await runPersistencePortIntegrationTest();
  console.log('\n🎉 All @asol/system-logs-core tests passed successfully!');
}

main().catch((error) => {
  console.error('\n❌ @asol/system-logs-core test suite failed:', error);
  process.exit(1);
});
