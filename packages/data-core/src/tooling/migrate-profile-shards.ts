import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  envPrefixForShard,
  type DatabaseShardName,
} from "../core/database/database-shards";

/**
 * One-time copy of the order shards from the previous Turso account to the
 * current one.
 *
 * Schema sync only ever applies DDL — it never copies rows — so moving a shard
 * between accounts needs this separate step. Rows go in with `INSERT OR REPLACE`
 * so a re-run after a partial failure converges instead of duplicating.
 *
 * Reads `LEGACY_<SHARD>_DATABASE_URL` / `_AUTH_TOKEN` and writes the current
 * `<SHARD>_*` values. It refuses to run when a source and target are the same
 * database, which is the mistake that would otherwise wipe nothing but waste an
 * afternoon.
 */

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

/**
 * The seven profile shards. `system-ops` is excluded on purpose: it holds system
 * logs and data-health records, not profile data, and stays on the original
 * account.
 */
const PROFILE_SHARDS = DATABASE_SHARD_NAMES.filter((name) =>
  name.startsWith("profile-"),
) as DatabaseShardName[];

function credentials(shard: DatabaseShardName, legacy: boolean) {
  const prefix = envPrefixForShard(shard);
  const url = process.env[`${legacy ? "LEGACY_" : ""}${prefix}_DATABASE_URL`];
  const authToken =
    process.env[`${legacy ? "LEGACY_" : ""}${prefix}_DATABASE_AUTH_TOKEN`];
  if (!url || !authToken) {
    throw new Error(
      `Missing ${legacy ? "LEGACY_" : ""}${prefix}_DATABASE_URL / _AUTH_TOKEN`,
    );
  }
  return { url, authToken };
}

/** libSQL accepts primitives and null only; anything else is a driver value. */
function toArg(value: unknown): string | number | bigint | ArrayBuffer | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    value instanceof ArrayBuffer
  ) {
    return value;
  }
  throw new Error(`Unsupported value type: ${typeof value}`);
}

async function main(): Promise<void> {
  let copied = 0;
  let mismatch = false;

  for (const shard of PROFILE_SHARDS) {
    const from = credentials(shard, true);
    const to = credentials(shard, false);
    if (from.url === to.url) {
      throw new Error(`${shard}: source and target are the same database`);
    }

    const source = createClient(from);
    const target = createClient(to);
    console.log(`\n${shard}`);

    for (const table of DATABASE_SHARDS[shard]) {
      const rows = await source.execute(`SELECT * FROM ${table}`);
      if (rows.rows.length > 0) {
        const columns = rows.columns;
        const statement = `INSERT OR REPLACE INTO ${table} (${columns
          .map((column) => `\`${column}\``)
          .join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
        for (const row of rows.rows) {
          await target.execute({
            sql: statement,
            args: columns.map((column) =>
              toArg((row as Record<string, unknown>)[column]),
            ),
          });
          copied += 1;
        }
      }

      const [before, after] = await Promise.all([
        source.execute(`SELECT COUNT(*) AS c FROM ${table}`),
        target.execute(`SELECT COUNT(*) AS c FROM ${table}`),
      ]);
      const a = Number(before.rows[0].c);
      const b = Number(after.rows[0].c);
      if (a !== b) mismatch = true;
      console.log(
        `  ${table.padEnd(34)} source=${String(a).padStart(4)} target=${String(b).padStart(4)} ${a === b ? "OK" : "MISMATCH"}`,
      );
    }
  }

  if (mismatch) throw new Error("Row counts differ — migration is incomplete.");
  console.log(`\nMigration complete: ${copied} row(s) across ${PROFILE_SHARDS.length} shards.`);
}

main().catch((error) => {
  console.error("Order shard migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
