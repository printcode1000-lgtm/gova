import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

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
  systemLogsRepository,
  normalizeIngestPayload,
  validateIngestBatchSize,
} from '../server';
import type { SystemLogInput } from '../domain/entities';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

/**
 * In-memory SQLite port for repository integration tests.
 * Uses Node's built-in `node:sqlite` so this package never imports the
 * `better-sqlite3` vendor owned by `@asol/data-core`.
 */
class MemoryDatabasePort {
  readonly db = new DatabaseSync(':memory:');

  async execute(sql: string, params: unknown[] = []) {
    const statement = this.db.prepare(sql);
    const head = sql.trimStart().slice(0, 6).toLowerCase();
    // node:sqlite does not always mark PRAGMA as a reader; treat read-shaped
    // statements as queries so callers receive a row array (better-sqlite3 shape).
    const isQuery =
      statement.reader ||
      head.startsWith('select') ||
      head.startsWith('pragma') ||
      head.startsWith('with');
    if (isQuery) return statement.all(...(params as never[]));
    return statement.run(...(params as never[]));
  }
}

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

async function runRepositoryIntegrationTest() {
  const database = new MemoryDatabasePort();
  resetSystemLogsCorePorts();
  configureSystemLogsCore({ database });

  await systemLogsRepository.add(
    sanitizePersistentSystemLog(
      {
        level: 'error',
        source: 'api',
        consoleMethod: 'server.error',
        message: 'authorization: Bearer private-token',
        page: '/api/orders',
        platform: 'server',
        routeName: 'POST /api/orders',
        statusCode: 500,
        requestMethod: 'POST',
        stack: 'x'.repeat(12_100),
        correlationId: createCorrelationId(),
      },
      'trusted-server',
    ),
  );

  const page = await systemLogsRepository.list({ origin: 'cloud', level: 'error' });
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0]?.trustLevel, 'trusted-server');
  assert.equal(page.items[0]?.stackTruncated, true);
  assert.equal(page.items[0]?.message.includes('private-token'), false);

  const summary = await systemLogsRepository.summary();
  assert.ok(summary.totalErrors >= 1);

  resetSystemLogsCorePorts();
  console.log('✅ system-logs-core repository integration test passed');
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
  await runRepositoryIntegrationTest();
  console.log('\n🎉 All @asol/system-logs-core tests passed successfully!');
}

main().catch((error) => {
  console.error('\n❌ @asol/system-logs-core test suite failed:', error);
  process.exit(1);
});
