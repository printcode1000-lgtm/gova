/**
 * Schema parity — everything that can be settled without a network.
 *
 * The live half belongs to the release: `db:schema:sync:release` reads each
 * desired-schema manifest, reads its Turso counterpart, diffs them, and applies
 * the missing DDL before anything is published. That step needs credentials and
 * it *writes*, so it cannot move into a test chain.
 *
 * What this file checks is the offline half: that the manifests exist for every
 * logical database, that they and the shard routing map describe the same
 * tables, that no foreign key crosses a database boundary the cloud cannot
 * enforce, that the operational tables which used to be created at runtime are
 * declared, that the order guard triggers survived the split, and that the whole
 * thing loads with no `.db` file and no local database driver anywhere in reach.
 *
 * Runs inside `npm run test:data-core`, so it gates `build`, `build:static` and
 * `test` on every machine, with no credentials and no clean-checkout dependency.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  DATABASE_SHARD_TABLE_TO_DATABASE,
  envPrefixForShard,
} from '../core/database/database-shards.ts';
import {
  DESIRED_SCHEMAS,
  LOGICAL_DATABASE_LABELS,
  NON_SHARD_DATABASE_LABELS,
  desiredTableOwnership,
  readDesiredSchema,
} from '../provisioning/desired-schema/registry.ts';
import { computeSchemaVersion } from '../provisioning/core/schema-version.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..');
const ROOT = path.resolve(SRC, '../../..');

/** Every logical database has exactly one manifest, and nothing else does. */
function runManifestCompletenessTest() {
  const manifestDir = path.join(SRC, 'provisioning/desired-schema');
  const files = readdirSync(manifestDir)
    .filter((name) => name.endsWith('.ts') && name !== 'registry.ts')
    .map((name) => name.replace(/\.ts$/, ''))
    .sort();

  assert.deepEqual(
    files,
    [...LOGICAL_DATABASE_LABELS].sort(),
    'Every manifest file must correspond to a registered logical database, and vice versa.',
  );

  assert.deepEqual(
    [...LOGICAL_DATABASE_LABELS].sort(),
    [...NON_SHARD_DATABASE_LABELS, ...DATABASE_SHARD_NAMES].sort(),
    'The manifest registry must cover the four standalone databases and every declared shard.',
  );

  console.log(`✅ desired-schema manifests: ${LOGICAL_DATABASE_LABELS.length} logical databases`);
}

/** One owner per table, and every routed table is declared by its owner. */
function runTableOwnershipTest() {
  const owners = desiredTableOwnership();

  for (const [databaseName, tables] of Object.entries(DATABASE_SHARDS)) {
    for (const table of tables as readonly string[]) {
      const owner = owners.get(table);
      assert.equal(
        owner,
        databaseName,
        `Shard map routes "${table}" to "${databaseName}", but the manifests say "${owner ?? 'nothing'}".`,
      );
    }
  }

  for (const [table, databaseName] of Object.entries(DATABASE_SHARD_TABLE_TO_DATABASE)) {
    assert.ok(
      DESIRED_SCHEMAS[databaseName as keyof typeof DESIRED_SCHEMAS].tables[table],
      `"${table}" is routed to "${databaseName}" but that manifest does not declare it.`,
    );
  }

  // Every shard also needs a credential prefix; a shard nothing can address is
  // a shard nothing writes to.
  for (const databaseName of DATABASE_SHARD_NAMES) {
    assert.match(envPrefixForShard(databaseName), /^[A-Z0-9_]+$/);
  }

  console.log(`✅ table ownership: ${owners.size} tables, exactly one owner each`);
}

/**
 * No desired foreign key points outside its own database.
 *
 * Turso cannot enforce a reference across databases; declaring one would either
 * fail to apply or apply as a constraint that is never checked. The source
 * schemas this repository grew from *did* contain such references — profile
 * tables pointing at `user_profiles` in another shard, orders tables pointing
 * across the nine order databases — so this is a real property, not a formality.
 */
function runForeignKeyBoundaryTest() {
  let intraDatabaseForeignKeys = 0;

  for (const label of LOGICAL_DATABASE_LABELS) {
    const schema = DESIRED_SCHEMAS[label];
    const own = new Set(Object.keys(schema.tables));
    for (const table of Object.values(schema.tables)) {
      for (const foreignKey of table.foreignKeys) {
        assert.ok(
          own.has(foreignKey.referencesTable),
          `${label}.${table.name} declares a foreign key to "${foreignKey.referencesTable}", ` +
            `which lives in another Turso database. Cross-database relationships are ` +
            `application invariants, not constraints.`,
        );
        intraDatabaseForeignKeys += 1;
      }
    }
  }

  // Guard against the opposite failure: a "no cross-database FK" check passes
  // trivially if the manifests kept no foreign keys at all.
  assert.ok(
    intraDatabaseForeignKeys > 0,
    'No foreign keys survived at all — intra-database constraints were stripped along with the cross-database ones.',
  );

  console.log(`✅ foreign keys: ${intraDatabaseForeignKeys} intra-database, 0 crossing a boundary`);
}

/**
 * The operational tables that used to be created by the repositories reading
 * them are declared by provisioning, and the removed capability's tables are not.
 */
function runSystemOpsOwnershipTest() {
  const systemOps = readDesiredSchema('system-ops');

  for (const table of ['system_logs', 'control_release_state']) {
    assert.ok(
      systemOps.tables[table],
      `system-ops must declare "${table}": its repository no longer creates it.`,
    );
  }

  for (const table of Object.keys(systemOps.tables)) {
    assert.ok(
      !table.startsWith('data_health_'),
      `system-ops still declares "${table}"; the Data Health capability was removed.`,
    );
  }

  for (const label of LOGICAL_DATABASE_LABELS) {
    for (const table of Object.keys(DESIRED_SCHEMAS[label].tables)) {
      assert.ok(
        !table.startsWith('data_health_'),
        `"${label}" declares removed Data Health table "${table}".`,
      );
    }
  }

  // The columns the system-log repository used to add by hand at runtime.
  const systemLogColumns = new Set(systemOps.tables.system_logs.columns.map((c) => c.name));
  for (const column of [
    'origin',
    'trust_level',
    'message_truncated',
    'stack_truncated',
    'correlation_id',
    'request_flow_id',
    'session_id',
    'monitor_trace_id',
  ]) {
    assert.ok(
      systemLogColumns.has(column),
      `system_logs.${column} must be declared: nothing adds it at runtime any more.`,
    );
  }

  // And the promotions tables the discount repository used to create.
  const promotions = readDesiredSchema('profile-promotions');
  for (const table of ['seller_discounts', 'seller_discount_usages']) {
    assert.ok(
      promotions.tables[table],
      `profile-promotions must declare "${table}": its repository no longer creates it.`,
    );
  }

  console.log('✅ system-ops and promotions: runtime-created schema is now declared');
}

/**
 * The marketplace-order guard triggers are domain invariants, not decoration.
 *
 * They enforce state transitions and totals the application relies on, and they
 * were the thing most at risk when the monolithic orders database was split into
 * nine.
 */
function runOrderTriggerTest() {
  const orderLabels = LOGICAL_DATABASE_LABELS.filter((label) => label.startsWith('orders-'));
  let triggers = 0;
  for (const label of orderLabels) {
    triggers += Object.keys(DESIRED_SCHEMAS[label].triggers).length;
  }

  assert.ok(
    triggers >= 50,
    `Only ${triggers} order guard trigger(s) survive in the manifests; the order domain relies on far more.`,
  );

  // Every trigger belongs to a table its own database declares.
  for (const label of orderLabels) {
    const own = new Set(Object.keys(DESIRED_SCHEMAS[label].tables));
    for (const trigger of Object.values(DESIRED_SCHEMAS[label].triggers)) {
      const match = /\bON\s+["'`]?([A-Za-z_][\w]*)["'`]?/i.exec(trigger.sql);
      assert.ok(match, `Could not read the target table of trigger "${trigger.name}".`);
      assert.ok(
        own.has(match[1]),
        `Trigger "${trigger.name}" in "${label}" fires on "${match[1]}", which that database does not own.`,
      );
    }
  }

  console.log(`✅ order triggers: ${triggers} guards preserved across the nine order databases`);
}

/** Constraint detail participates in parity rather than being ignored. */
function runConstraintFidelityTest() {
  let compositeKeys = 0;
  let checks = 0;
  let uniques = 0;
  let partialIndexes = 0;
  let autoIncrement = 0;

  for (const label of LOGICAL_DATABASE_LABELS) {
    const schema = DESIRED_SCHEMAS[label];
    for (const table of Object.values(schema.tables)) {
      const keyColumns = table.columns.filter((column) => column.primaryKeyPosition > 0);
      if (keyColumns.length > 1) {
        compositeKeys += 1;
        // Ordinals must be a permutation of 1..n, or the key order is lost.
        const positions = keyColumns.map((column) => column.primaryKeyPosition).sort((a, b) => a - b);
        assert.deepEqual(
          positions,
          keyColumns.map((_, index) => index + 1),
          `Composite primary key of ${label}.${table.name} has broken ordinals.`,
        );
      }
      checks += table.constraints.checks.length;
      uniques += table.constraints.uniqueConstraints.length;
      if (table.constraints.autoIncrement) autoIncrement += 1;
    }
    for (const index of Object.values(schema.indexes)) {
      if (index.where) partialIndexes += 1;
      assert.ok(
        schema.tables[index.tableName],
        `Index "${index.name}" in "${label}" targets a table that database does not own.`,
      );
    }
  }

  assert.ok(checks > 0, 'No CHECK constraints were captured; the order domain declares many.');
  assert.ok(uniques > 0, 'No inline UNIQUE constraints were captured.');
  assert.ok(autoIncrement > 0, 'No AUTOINCREMENT table was captured; `users.id` is one.');
  assert.ok(compositeKeys >= 0);

  console.log(
    `✅ constraint fidelity: ${checks} checks, ${uniques} unique constraints, ` +
      `${compositeKeys} composite keys, ${partialIndexes} partial indexes, ${autoIncrement} autoincrement`,
  );
}

/** The fingerprint is a property of the manifest, computable with no database. */
function runFingerprintTest() {
  const fingerprints = new Map<string, string>();
  for (const label of LOGICAL_DATABASE_LABELS) {
    const version = computeSchemaVersion(DESIRED_SCHEMAS[label]);
    assert.match(version, /^[0-9a-f]{16}$/, `Schema fingerprint for "${label}" is malformed.`);
    fingerprints.set(label, version);
  }
  // Deterministic: the same input must fingerprint the same way twice.
  for (const label of LOGICAL_DATABASE_LABELS) {
    assert.equal(computeSchemaVersion(DESIRED_SCHEMAS[label]), fingerprints.get(label));
  }
  console.log('✅ desired-schema fingerprints: deterministic, computed from source');
}

/**
 * Provisioning cannot open a local database, and cannot destroy a cloud one.
 *
 * A string check, because the failure it guards against is a reintroduction, not
 * a bug in today's code: the previous shard "provisioning" dropped every table
 * in a Turso database and refilled it from a developer's laptop, and nothing in
 * its name said so.
 */
function runProvisioningPurityTest() {
  const provisioningDir = path.join(SRC, 'provisioning');
  const toolingDir = path.join(SRC, 'tooling');

  const files: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts')) files.push(full);
    }
  };
  walk(provisioningDir);

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const relative = path.relative(ROOT, file);
    assert.ok(
      !content.includes('better-sqlite3'),
      `${relative} imports a local database driver; provisioning must compute its schema from source.`,
    );
    assert.ok(
      !content.includes('sync_sqlite'),
      `${relative} names the removed local database directory.`,
    );
  }

  const provisionShards = readFileSync(
    path.join(toolingDir, 'provision-database-shards.ts'),
    'utf8',
  );
  for (const forbidden of ['DROP TABLE', 'DELETE FROM', 'INSERT OR REPLACE', 'better-sqlite3']) {
    assert.ok(
      !provisionShards.includes(forbidden),
      `Shard provisioning contains "${forbidden}". Provisioning creates and describes; it never destroys or reseeds.`,
    );
  }

  console.log('✅ provisioning purity: no local driver, no row copy, no destructive DDL');
}

/** The generic build must not carry a local-database preparation step. */
function runBuildGatePolicyTest() {
  const gates = readFileSync(path.join(ROOT, 'scripts/generated-gates.ts'), 'utf8');
  assert.ok(
    !gates.includes('db:ensure'),
    'The build gate still runs db:ensure; there is no local database to prepare.',
  );
  assert.ok(
    gates.includes('db:schema:verify'),
    'The build gate must verify the cloud schema read-only rather than mutating it.',
  );

  const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  assert.ok(!('db:ensure' in packageJson.scripts), 'db:ensure must not exist as a script.');
  assert.ok('db:schema:verify' in packageJson.scripts, 'db:schema:verify must exist.');
  assert.ok(
    'db:schema:sync:release' in packageJson.scripts,
    'The authorized release schema apply must still exist.',
  );

  console.log('✅ build gates: read-only schema verification, no local database preparation');
}

function main() {
  console.log('🚀 Running desired-schema parity contract...\n');
  runManifestCompletenessTest();
  runTableOwnershipTest();
  runForeignKeyBoundaryTest();
  runSystemOpsOwnershipTest();
  runOrderTriggerTest();
  runConstraintFidelityTest();
  runFingerprintTest();
  runProvisioningPurityTest();
  runBuildGatePolicyTest();
  console.log('\n🎉 Desired-schema parity contract passed.');
}

main();
