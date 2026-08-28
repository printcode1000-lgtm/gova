import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { createClient, type Client } from "@libsql/client";
import { legacyEgyptianPhoneToE164, phoneSearchKey } from "@asol/auth-core";
import {
  DATABASE_SHARD_NAMES,
  envPrefixForShard,
  type DatabaseShardName,
} from "../core/database/database-shards";

/**
 * Rewrite every stored phone number into the canonical E.164 spelling.
 *
 * Schema sync only ever applies DDL, so the deployed rows written before the
 * application understood country codes need this separate pass. Every one of
 * them is an Egyptian number stored as `01…`, `20…`, or a bare national key,
 * and the rewrite of each is deterministic — so the pass is idempotent and a
 * re-run after a partial failure converges instead of double-prefixing.
 *
 * `--apply` performs the writes; without it the run only reports what would
 * change.
 */

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const APPLY = process.argv.includes("--apply");

const PROFILE_SHARDS = DATABASE_SHARD_NAMES.filter((name) =>
  name.startsWith("profile-"),
) as DatabaseShardName[];

interface PhoneRewrite {
  table: string;
  keyColumn: string;
  /** Columns holding a displayed number, rewritten to E.164. */
  valueColumns: string[];
  /** Columns holding a lookup key, rewritten to E.164 digits. */
  keyColumns: string[];
  where?: string;
}

const USERS_REWRITES: PhoneRewrite[] = [
  { table: "users", keyColumn: "uid", valueColumns: ["phone"], keyColumns: [] },
];

const PROFILE_REWRITES: PhoneRewrite[] = [
  {
    table: "user_profiles",
    keyColumn: "uid",
    valueColumns: ["primary_phone", "primary_whatsapp"],
    keyColumns: ["primary_phone_normalized", "primary_whatsapp_normalized"],
  },
  {
    table: "profile_contact_points",
    keyColumn: "id",
    valueColumns: ["value"],
    keyColumns: ["normalized_value"],
    where: "type = 'phone'",
  },
];

/** The E.164 spelling of a stored display value, or `null` when it is already right. */
function nextValue(current: string): string | null {
  const value = current.trim();
  if (!value || value.startsWith("+")) return null;
  const migrated = legacyEgyptianPhoneToE164(value);
  return migrated && migrated !== value ? migrated : null;
}

/** The E.164 digits of a stored lookup key, or `null` when it is already right. */
function nextKey(current: string): string | null {
  const value = current.trim();
  if (!value) return null;
  const migrated = legacyEgyptianPhoneToE164(value);
  const next = migrated ? migrated.slice(1) : phoneSearchKey(value);
  return next && next !== value ? next : null;
}

async function rewriteTable(
  client: Client,
  label: string,
  rewrite: PhoneRewrite,
): Promise<number> {
  const columns = [...rewrite.valueColumns, ...rewrite.keyColumns];
  const rows = await client.execute(
    `SELECT ${rewrite.keyColumn}, ${columns.join(", ")} FROM ${rewrite.table}${
      rewrite.where ? ` WHERE ${rewrite.where}` : ""
    }`,
  );

  let changed = 0;
  for (const row of rows.rows as unknown as Array<Record<string, unknown>>) {
    const updates: string[] = [];
    const args: string[] = [];
    for (const column of rewrite.valueColumns) {
      const next = nextValue(String(row[column] ?? ""));
      if (next === null) continue;
      updates.push(`${column} = ?`);
      args.push(next);
    }
    for (const column of rewrite.keyColumns) {
      const next = nextKey(String(row[column] ?? ""));
      if (next === null) continue;
      updates.push(`${column} = ?`);
      args.push(next);
    }
    if (updates.length === 0) continue;
    changed += 1;
    if (!APPLY) continue;
    await client.execute({
      sql: `UPDATE ${rewrite.table} SET ${updates.join(", ")} WHERE ${rewrite.keyColumn} = ?`,
      args: [...args, String(row[rewrite.keyColumn])],
    });
  }
  console.log(
    `  ${label}.${rewrite.table.padEnd(24)} ${String(changed).padStart(5)} row(s) ${
      APPLY ? "rewritten" : "would change"
    }`,
  );
  return changed;
}

function credentials(urlKey: string, tokenKey: string) {
  const url = process.env[urlKey];
  const authToken = process.env[tokenKey];
  return url && authToken ? { url, authToken } : null;
}

async function main(): Promise<void> {
  let total = 0;

  const users = credentials("TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN");
  if (!users) {
    console.log("users: skipped (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set)");
  } else {
    console.log("users");
    const client = createClient(users);
    for (const rewrite of USERS_REWRITES) {
      total += await rewriteTable(client, "users", rewrite);
    }
  }

  for (const shard of PROFILE_SHARDS) {
    const prefix = envPrefixForShard(shard);
    const shardCredentials = credentials(
      `${prefix}_DATABASE_URL`,
      `${prefix}_DATABASE_AUTH_TOKEN`,
    );
    if (!shardCredentials) {
      console.log(`${shard}: skipped (${prefix}_DATABASE_URL / _AUTH_TOKEN not set)`);
      continue;
    }
    console.log(shard);
    const client = createClient(shardCredentials);
    for (const rewrite of PROFILE_REWRITES) {
      total += await rewriteTable(client, shard, rewrite);
    }
  }

  console.log(
    APPLY
      ? `\nPhone migration complete: ${total} row(s) rewritten.`
      : `\nDry run: ${total} row(s) would change. Re-run with --apply to write them.`,
  );
}

main().catch((error) => {
  console.error(
    "Phone migration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
