/**
 * Schema parity — the offline half.
 *
 * The live half already exists and belongs to the release: `db:schema:sync:release` reads each
 * local SQLite source, reads its Turso counterpart, diffs them, and applies the missing DDL
 * before anything is pushed. That step needs credentials and it *writes*, so it cannot move
 * into a test chain and must not be duplicated — running the same comparison twice would either
 * apply DDL twice or make a green build depend on a live database.
 *
 * What this file checks is everything that can be settled without a network: that the declared
 * shard map, the migration DDL, and the local database files describe the *same* schema. Every
 * drift the sync would discover against Turso starts here, because Turso's schema is produced
 * from these files — a table that no migration creates cannot exist in the cloud either, and a
 * table claimed by two shards routes its writes to whichever one the map resolves first.
 *
 * Runs inside `npm run test:data-core`, so it gates `build`, `build:static`, and `test` on every
 * machine, with no credentials and no clean-checkout dependency.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  DATABASE_SHARD_TABLE_TO_DATABASE,
  MARKETPLACE_ORDER_SHARDS,
  PROFILE_SHARDS,
  envPrefixForShard,
} from '../core/database/database-shards.ts';
import {
  SYSTEM_LOG_COMPATIBILITY_COLUMNS,
  missingSystemLogColumnStatements,
} from '../tooling/ensure-system-logs-schema.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..');

/**
 * Where the DDL for each shard family is written.
 *
 * The profile family has two sources, and that is deliberate rather than an oversight: the
 * `system-ops` shard's data-health tables are created from a TypeScript DDL module applied at
 * runtime by the health engine, not from a numbered migration. Listing only the migration
 * folder here would report those eight tables as missing.
 */
const MIGRATION_SOURCES = [
  {
    family: 'profile',
    shards: PROFILE_SHARDS,
    dirs: [path.join(SRC, 'core/database/profile/migrations')],
    files: [path.join(SRC, 'domains/data-health/db/metadata-schema.ts')],
  },
  {
    family: 'marketplace-orders',
    shards: MARKETPLACE_ORDER_SHARDS,
    dirs: [path.join(SRC, 'domains/marketplace-orders/db/migrations')],
    files: [],
  },
] as const;

function ddlOf(source: (typeof MIGRATION_SOURCES)[number]): string {
  const parts: string[] = [];
  for (const dir of source.dirs) {
    assert.ok(existsSync(dir), `Migration folder is missing: ${dir}`);
    const sql = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    assert.ok(sql.length > 0, `No migration SQL in ${dir}. A shard with no DDL cannot be synced.`);
    parts.push(...sql.map((f) => readFileSync(path.join(dir, f), 'utf8')));
  }
  for (const file of source.files) {
    assert.ok(existsSync(file), `DDL module is missing: ${file}`);
    parts.push(readFileSync(file, 'utf8'));
  }
  return parts.join('\n');
}

function createdTables(ddl: string): Set<string> {
  const tables = new Set<string>();
  for (const match of ddl.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([A-Za-z0-9_]+)[`"']?/gi,
  )) {
    tables.add(match[1]);
  }
  return tables;
}

// The system-logs repository reads and writes these security/correlation
// columns. Keep both the Drizzle source and new-database migration aligned so
// live Turso columns cannot remain invisible to the local schema reference.
const systemLogColumns = [
  'origin',
  'trust_level',
  'message_truncated',
  'stack_truncated',
  'correlation_id',
  'request_flow_id',
  'session_id',
  'monitor_trace_id',
] as const;
const systemLogMigration = readFileSync(
  path.join(SRC, 'core/database/profile/migrations/0013_system_logs.sql'),
  'utf8',
);
const profileSchema = readFileSync(
  path.join(SRC, 'core/database/profile/profile.schema.ts'),
  'utf8',
);
for (const column of systemLogColumns) {
  assert.match(
    systemLogMigration,
    new RegExp(`\\b${column}\\b`),
    `system_logs migration is missing repository-owned column ${column}.`,
  );
  assert.ok(
    profileSchema.includes(`("${column}")`),
    `Drizzle system_logs schema is missing repository-owned column ${column}.`,
  );
}
assert.deepEqual(
  SYSTEM_LOG_COMPATIBILITY_COLUMNS.map(([name]) => name),
  systemLogColumns,
  'The existing-database upgrader and declared system-log schema columns must stay aligned.',
);
assert.equal(
  missingSystemLogColumnStatements(new Set(systemLogColumns)).length,
  0,
  'The system-log upgrader must be idempotent when all compatibility columns exist.',
);
assert.match(
  missingSystemLogColumnStatements(new Set(systemLogColumns.slice(1)))[0] ?? '',
  /^ALTER TABLE system_logs ADD COLUMN origin /,
  'The system-log upgrader must add a missing column with explicit DDL.',
);

// ── Every declared table is created by a migration ──────────────────────────
for (const source of MIGRATION_SOURCES) {
  const created = createdTables(ddlOf(source));
  for (const [shard, tables] of Object.entries(source.shards)) {
    for (const table of tables) {
      assert.ok(
        created.has(table),
        `Shard "${shard}" claims table "${table}", but no migration in ${source.family} creates ` +
          'it. The schema sync would push a shard that cannot hold what routes to it.',
      );
    }
  }
}

// ── No table belongs to two shards ──────────────────────────────────────────
const owner = new Map<string, string>();
for (const [shard, tables] of Object.entries(DATABASE_SHARDS)) {
  for (const table of tables) {
    const previous = owner.get(table);
    assert.ok(
      previous === undefined,
      `Table "${table}" is declared by both "${previous}" and "${shard}". The router resolves one ` +
        'of them and the other silently never receives a write.',
    );
    owner.set(table, shard);
  }
}

// ── The lookup map agrees with the shard map it is derived from ─────────────
for (const [table, shard] of Object.entries(DATABASE_SHARD_TABLE_TO_DATABASE)) {
  assert.equal(
    owner.get(table),
    shard,
    `The table→shard lookup routes "${table}" to "${shard}", which is not what DATABASE_SHARDS says.`,
  );
}
assert.equal(
  Object.keys(DATABASE_SHARD_TABLE_TO_DATABASE).length,
  owner.size,
  'The table→shard lookup and the shard map cover different table sets.',
);

// ── Every shard has a usable environment prefix, and they are distinct ──────
const prefixes = new Map<string, string>();
for (const shard of DATABASE_SHARD_NAMES) {
  const prefix = envPrefixForShard(shard);
  assert.match(
    prefix,
    /^[A-Z0-9_]+$/,
    `Shard "${shard}" produces the environment prefix "${prefix}", which cannot name a variable.`,
  );
  const clash = prefixes.get(prefix);
  assert.ok(
    clash === undefined,
    `Shards "${clash}" and "${shard}" both resolve to ${prefix}_DATABASE_URL — one would read the ` +
      "other's credentials.",
  );
  prefixes.set(prefix, shard);
}

// ── Every database the sync knows about is actually synced ─────────────────
//
// The seventeen shards are covered by a loop over DATABASE_SHARD_NAMES, so a new shard is
// synced the moment it is declared. The four standalone databases are hand-listed, and a fifth
// added to the routing table but not to `runAllSchemaSyncs` would drift forever without ever
// failing anything — nothing would compare it to its cloud counterpart.
const syncSource = readFileSync(path.join(SRC, 'provisioning/core/schema-sync.ts'), 'utf8');
const routingBlock = /const LOGICAL_DATABASE_TABLES[\s\S]*?\n\};/.exec(syncSource);
assert.ok(routingBlock, 'LOGICAL_DATABASE_TABLES is gone; nothing declares which tables a database owns.');
const standaloneLabels = [...routingBlock[0].matchAll(/^\s{2}([a-z_]+):\s*new Set\(/gm)].map(
  (m) => m[1],
);
assert.ok(
  standaloneLabels.length > 0,
  'No standalone database found in the routing table — the parser stopped matching reality.',
);
const syncedLabels = new Set(
  [...syncSource.matchAll(/databaseLabel:\s*'([a-z-]+)'/g)].map((m) => m[1]),
);
for (const label of standaloneLabels) {
  assert.ok(
    syncedLabels.has(label),
    `"${label}" is a routed database but runAllSchemaSyncs never syncs it. Its cloud schema ` +
      'would never be compared to the local one.',
  );
}
assert.ok(
  syncSource.includes('for (const databaseName of DATABASE_SHARD_NAMES)'),
  'Shard syncing no longer iterates DATABASE_SHARD_NAMES. A hand-written shard list drifts from ' +
    'the routing table the first time a shard is added.',
);
assert.ok(
  syncSource.includes('residualOperations'),
  'The read-back verification is gone. Without it the sync can report success while the cloud ' +
    'still differs — "the DDL was sent" is not "the cloud matches".',
);

// ── The release step that does the live half is still wired ────────────────
const rootManifest = JSON.parse(
  readFileSync(path.resolve(SRC, '../../../package.json'), 'utf8'),
);
assert.ok(
  rootManifest.scripts['db:schema:sync:release'],
  'db:schema:sync:release is gone. It is the only step that reconciles these files with Turso.',
);
const deployAll = readFileSync(path.resolve(SRC, '../../../scripts/deploy-all.ts'), 'utf8');
const deployAllRunbook = readFileSync(
  path.resolve(SRC, '../../../packages/release-core/src/console/deploy-all-runbook.ts'),
  'utf8',
);
assert.ok(
  deployAll.includes('DEPLOY_ALL_PREFLIGHT_SECTIONS'),
  'deploy:all must drive preflight from DEPLOY_ALL_PREFLIGHT_SECTIONS so release schema sync stays wired.',
);
assert.ok(
  deployAllRunbook.includes('db:schema:sync:release'),
  'deploy:all preflight runbook no longer runs db:schema:sync:release. Local schema would ship ahead of the cloud, ' +
    'and code expecting a new column would reach production before the column does.',
);

console.log(
  `@asol/data-core schema parity: ${DATABASE_SHARD_NAMES.length} shards, ${owner.size} tables, ` +
    'all created by migrations, uniquely owned, and distinctly credentialed.',
);
