import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  MARKETPLACE_ORDER_TABLE_TO_DATABASE,
  PROFILE_SHARD_TABLE_TO_DATABASE,
} from "../../../core/database/database-shards";

type DatabaseConstructor = new (
  filename: string,
  options: { readonly: boolean; fileMustExist: boolean },
) => {
  prepare(sql: string): { all(): Array<{ name: string }> };
  close(): void;
};

interface SelectReference {
  table: string;
  columns: string[];
}

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3") as DatabaseConstructor;
const root = process.cwd();
const sqliteDirectory = path.join(root, "public", "sync_data", "sync_sqlite");
const repositoryPath = path.join(
  root,
  "packages",
  "data-core",
  "src",
  "domains",
  "account-deletion",
  "repositories",
  "account-deletion-repository.server.ts",
);

function parseSelectReferences(source: string): SelectReference[] {
  const references: SelectReference[] = [];
  for (const literal of source.matchAll(/"(SELECT[^"]+)"/gi)) {
    const sql = literal[1];
    assert.ok(sql, "Account-deletion SELECT literal must not be empty.");
    const match = /^SELECT\s+(.+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(sql);
    assert.ok(match, `Could not parse account-deletion SELECT: ${sql}`);
    const selectedColumns = match[1].split(",").map((part) => {
      const withoutAlias = part.trim().split(/\s+AS\s+/i)[0];
      return withoutAlias.split(".").at(-1) ?? withoutAlias;
    });
    const whereClause =
      /\bWHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i.exec(sql)?.[1] ??
      "";
    const sqlKeywords = new Set([
      "and",
      "or",
      "is",
      "not",
      "null",
      "like",
      "in",
      "between",
      "true",
      "false",
    ]);
    const predicateColumns = [...whereClause.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)]
      .map((token) => token[0])
      .filter((token) => !sqlKeywords.has(token.toLowerCase()));
    references.push({
      table: match[2],
      columns: [...new Set([...selectedColumns, ...predicateColumns])],
    });
  }
  return references;
}

function databaseFileFor(table: string): string {
  const profileShard =
    PROFILE_SHARD_TABLE_TO_DATABASE[
      table as keyof typeof PROFILE_SHARD_TABLE_TO_DATABASE
    ];
  if (profileShard) return `${profileShard}.db`;

  const ordersShard =
    MARKETPLACE_ORDER_TABLE_TO_DATABASE[
      table as keyof typeof MARKETPLACE_ORDER_TABLE_TO_DATABASE
    ];
  if (ordersShard) return `${ordersShard}.db`;

  if (
    table === "users" ||
    table === "password_recovery_challenges" ||
    table === "ota_releases" ||
    table === "ota_release_audit"
  ) {
    return "allusers.db";
  }
  if (
    table === "products" ||
    table.startsWith("pharmacy_profile_") ||
    table.startsWith("product_review")
  ) {
    return "product.db";
  }
  if (table.startsWith("user_notification_")) return "notifications.db";

  throw new Error(
    `Account-deletion SELECT references "${table}", but the schema contract has no shard mapping for it.`,
  );
}

const source = readFileSync(repositoryPath, "utf8");
const references = parseSelectReferences(source);
assert.deepEqual(
  [...new Set(references.map((reference) => reference.table))].sort(),
  [
    "custom_request_images",
    "pharmacy_profile_product_overrides",
    "products",
    "profile_images",
    "user_profiles",
    "users",
  ],
  "The schema test must be updated whenever account deletion adds or removes a SELECT source.",
);

let checked = 0;
const skipped = new Set<string>();
const present = new Set<string>();
for (const reference of references) {
  const fileName = databaseFileFor(reference.table);
  const databasePath = path.join(sqliteDirectory, fileName);
  if (!existsSync(databasePath)) {
    skipped.add(fileName);
    continue;
  }
  present.add(fileName);

  const database = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const columns = new Set(
      database
        .prepare(
          `PRAGMA table_info("${reference.table.replace(/"/g, '""')}")`,
        )
        .all()
        .map((column) => column.name),
    );
    assert.ok(
      columns.size > 0,
      `${fileName} does not contain table "${reference.table}".`,
    );
    for (const column of reference.columns) {
      assert.match(
        column,
        /^[A-Za-z_][A-Za-z0-9_]*$/,
        `Unsupported SELECT expression "${column}" in account deletion; extend the schema parser explicitly.`,
      );
      assert.ok(
        columns.has(column),
        `${fileName}.${reference.table} does not contain selected column "${column}".`,
      );
      checked += 1;
    }
  } finally {
    database.close();
  }
}

/**
 * Nothing on disk is a skip; something on disk that yielded nothing is a bug.
 *
 * The two cases have to be told apart, and conflating them broke a production
 * deployment: a cloud build machine is a fresh clone whose shards do not exist
 * yet — `db:ensure` runs later in the `build` chain, and the deployment reads
 * Turso anyway — so every shard was skipped, `checked` stayed at 0, and a
 * blanket `checked > 0` failed the whole build on a machine where nothing was
 * wrong.
 *
 * The guard is still worth having: with shards present, zero checked columns
 * means the SELECT parser stopped matching and the contract has quietly become
 * a no-op.
 */
if (present.size === 0) {
  console.log(
    "Account-deletion query schema contract skipped: no local SQLite shard is on disk " +
      `(${[...skipped].sort().join(", ")}). Run db:ensure to create them; a cloud build has none.`,
  );
} else {
  assert.ok(
    checked > 0,
    `The account-deletion schema contract checked no columns, though ${present.size} shard(s) were readable — the SELECT parser has stopped matching.`,
  );
  if (skipped.size > 0) {
    console.log(`Skipped absent account-deletion shard(s): ${[...skipped].sort().join(", ")}`);
  }
  console.log(`Account-deletion query schema contract passed (${checked} columns checked).`);
}
