import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";

/**
 * One-time copy of the product tables from the previous Turso account to the
 * current one.
 *
 * Schema sync only ever applies DDL — it never copies rows — so moving the
 * database between accounts needs this separate step. It is idempotent: rows are
 * inserted with `INSERT OR REPLACE`, so a re-run after a partial failure
 * converges rather than duplicating.
 *
 * Reads `LEGACY_PRODUCT_*` and writes `TURSO_PRODUCT_*`. Once the new account is
 * verified, the legacy values can be deleted from `.env`.
 */

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const TABLES = [
  "products",
  "product_reviews",
  "product_review_replies",
  "product_review_helpful",
  "pharmacy_profile_category_overrides",
  "pharmacy_profile_subcategory_overrides",
  "pharmacy_profile_product_overrides",
] as const;

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

async function main(): Promise<void> {
  const source = createClient({
    url: requireEnv("LEGACY_PRODUCT_DATABASE_URL"),
    authToken: requireEnv("LEGACY_PRODUCT_AUTH_TOKEN"),
  });
  const target = createClient({
    url: requireEnv("TURSO_PRODUCT_DATABASE_URL"),
    authToken: requireEnv("TURSO_PRODUCT_AUTH_TOKEN"),
  });

  if (
    process.env.LEGACY_PRODUCT_DATABASE_URL === process.env.TURSO_PRODUCT_DATABASE_URL
  ) {
    throw new Error("Source and target are the same database — nothing to migrate.");
  }

  let copied = 0;
  for (const table of TABLES) {
    const rows = await source.execute(`SELECT * FROM ${table}`);
    if (rows.rows.length === 0) {
      console.log(`${table.padEnd(40)} 0 rows`);
      continue;
    }

    const columns = rows.columns;
    const placeholders = columns.map(() => "?").join(", ");
    const statement = `INSERT OR REPLACE INTO ${table} (${columns
      .map((column) => `\`${column}\``)
      .join(", ")}) VALUES (${placeholders})`;

    for (const row of rows.rows) {
      const args = columns.map((column) => {
        const value = (row as Record<string, unknown>)[column];
        // libSQL accepts only primitives and null; anything else is a driver
        // representation we must not silently coerce.
        if (value === null || value === undefined) return null;
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "bigint" ||
          value instanceof ArrayBuffer
        ) {
          return value;
        }
        throw new Error(
          `${table}.${column} has an unsupported value type: ${typeof value}`,
        );
      });
      await target.execute({ sql: statement, args });
      copied += 1;
    }
    console.log(`${table.padEnd(40)} ${rows.rows.length} rows copied`);
  }

  console.log(`\nVerifying row counts match:`);
  let mismatch = false;
  for (const table of TABLES) {
    const [before, after] = await Promise.all([
      source.execute(`SELECT COUNT(*) AS c FROM ${table}`),
      target.execute(`SELECT COUNT(*) AS c FROM ${table}`),
    ]);
    const a = Number(before.rows[0].c);
    const b = Number(after.rows[0].c);
    const ok = a === b;
    if (!ok) mismatch = true;
    console.log(`  ${table.padEnd(40)} source=${a} target=${b} ${ok ? "OK" : "MISMATCH"}`);
  }

  if (mismatch) throw new Error("Row counts differ — migration is incomplete.");
  console.log(`\nMigration complete: ${copied} row(s).`);
}

main().catch((error) => {
  console.error("Product migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
