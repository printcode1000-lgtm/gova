import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Guards which SQL shapes the sharded client can route.
 *
 * The router infers a shard from the table names it can find in a statement.
 * When it finds none it throws, and the statements it could not see were not
 * exotic — they were the ones an additive migration runs:
 *
 *   PRAGMA table_info(system_logs)
 *   ALTER TABLE system_logs ADD COLUMN …
 *
 * Both name their table somewhere the clause patterns never looked, so the OTA
 * admin dashboard — which lists system logs — failed in production with
 * "Cannot route SQL without a known shard table". A shape the router cannot see
 * fails at the call site, far from this file, so the shapes are pinned here.
 */

const source = readFileSync(
  path.join(
    process.cwd(),
    "packages/data-core/src/core/database/sharded-raw-database-client.ts",
  ),
  "utf8",
);

/** The pattern list the client actually uses, lifted from its source. */
function routerPatterns(): RegExp[] {
  const block = /const patterns = \[([\s\S]*?)\n  \];/.exec(source);
  assert.ok(block, "Could not find the pattern list in sharded-raw-database-client.ts");
  const patterns = [...block[1].matchAll(/^\s*(\/(?:\\.|[^\\/])+\/[gimsuy]*),\s*$/gm)]
    .map(([, literal]) => {
      const end = literal.lastIndexOf("/");
      return new RegExp(literal.slice(1, end), literal.slice(end + 1));
    });
  assert.ok(patterns.length >= 8, `Expected the full pattern list, parsed ${patterns.length}`);
  return patterns;
}

const patterns = routerPatterns();

function referencedTables(sql: string, known: Set<string>): string[] {
  const found = new Set<string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of sql.matchAll(pattern)) {
      if (known.has(match[1])) found.add(match[1]);
    }
  }
  return [...found];
}

const known = new Set(["system_logs", "orders", "order_items", "user_profiles"]);

// ── Shapes that must route ───────────────────────────────────────────────────

const mustRoute: Array<[string, string]> = [
  // The two that failed in production, in the exact form the repository emits.
  ["PRAGMA table_info(system_logs)", "system_logs"],
  ["ALTER TABLE system_logs ADD COLUMN console_method text NOT NULL DEFAULT ''", "system_logs"],
  // Quoting and spacing variants of the same statements.
  ['PRAGMA table_info("system_logs")', "system_logs"],
  ["PRAGMA index_list( orders )", "orders"],
  ["ALTER TABLE `orders` ADD COLUMN note text", "orders"],
  // Ordinary traffic, to prove the additions changed nothing else.
  ["SELECT * FROM system_logs WHERE level = ?", "system_logs"],
  ["INSERT INTO orders (id) VALUES (?)", "orders"],
  ["UPDATE user_profiles SET uid = ?", "user_profiles"],
  ["DELETE FROM order_items WHERE id = ?", "order_items"],
  ["CREATE TABLE IF NOT EXISTS system_logs (id text)", "system_logs"],
  ["CREATE INDEX idx ON system_logs (level)", "system_logs"],
];

for (const [sql, expected] of mustRoute) {
  const tables = referencedTables(sql, known);
  assert.deepEqual(
    tables,
    [expected],
    `The router cannot resolve a single shard for: ${sql}\n` +
      `Found [${tables.join(", ")}]. Unroutable SQL throws at the call site.`,
  );
}

// ── Shapes that must NOT be forced to a shard ────────────────────────────────

// A database-wide pragma names no table; the client answers these directly
// rather than guessing a shard, so the extractor must keep finding nothing.
for (const sql of ["PRAGMA quick_check", "PRAGMA foreign_key_check"]) {
  assert.deepEqual(
    referencedTables(sql, known),
    [],
    `${sql} is database-wide and must not resolve to a table.`,
  );
}

// ── The client must still handle the two database-wide pragmas itself ────────

for (const pragma of ["quick_check", "foreign_key_check"]) {
  assert.ok(
    new RegExp(`PRAGMA\\\\s\\+${pragma}`).test(source),
    `sharded-raw-database-client.ts no longer short-circuits PRAGMA ${pragma}, ` +
      "which has no table to route by and would start throwing.",
  );
}

console.log("Shard SQL routing contract passed.");
