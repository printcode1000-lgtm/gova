import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  desiredTableOwnership,
  readDesiredSchema,
} from "../../../provisioning/desired-schema/registry";

/**
 * Every column account deletion selects on exists in the database that owns its
 * table.
 *
 * This used to open `public/sync_data/sync_sqlite/*.db` and skip whenever a file
 * was absent — so on a cloud build machine, which is a fresh clone with no
 * shards, it checked nothing and announced that it had. A contract that
 * silently degrades to a no-op on exactly the machine that ships the code is not
 * a contract.
 *
 * The desired-schema manifests are the source now: they are TypeScript this
 * build already contains, so the check runs the same everywhere, needs no
 * database and no credentials, and has no skip branch to hide behind.
 */

interface SelectReference {
  table: string;
  columns: string[];
}

const root = process.cwd();
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

const owners = desiredTableOwnership();

function databaseFor(table: string): string {
  const owner = owners.get(table);
  assert.ok(
    owner,
    `Account-deletion SELECT references "${table}", which no desired-schema manifest declares.`,
  );
  return owner;
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
for (const reference of references) {
  const databaseLabel = databaseFor(reference.table);
  const schema = readDesiredSchema(databaseLabel);
  const table = schema.tables[reference.table];
  assert.ok(
    table,
    `The "${databaseLabel}" desired schema does not declare table "${reference.table}".`,
  );

  const columns = new Set(table.columns.map((column) => column.name));
  for (const column of reference.columns) {
    assert.match(
      column,
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      `Unsupported SELECT expression "${column}" in account deletion; extend the schema parser explicitly.`,
    );
    assert.ok(
      columns.has(column),
      `${databaseLabel}.${reference.table} does not declare selected column "${column}".`,
    );
    checked += 1;
  }
}

// No skip branch to explain a zero. Zero checked columns can now only mean the
// SELECT parser stopped matching and the contract became a no-op.
assert.ok(
  checked > 0,
  "The account-deletion schema contract checked no columns — the SELECT parser has stopped matching.",
);

console.log(
  `Account-deletion query schema contract passed (${checked} columns checked, no database opened).`,
);
