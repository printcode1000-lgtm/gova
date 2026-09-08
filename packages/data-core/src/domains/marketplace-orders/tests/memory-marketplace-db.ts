import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { MarketplaceDb } from "../ports/marketplace-order-store";

/**
 * An in-memory marketplace database for the order tests.
 *
 * Test-only, and it lives under `tests/` so that is structural rather than a
 * promise: server application data is Turso in every runtime, and the only place
 * a local database driver may still appear is an isolated test that opens
 * `:memory:` and touches no application persistence path. These tests exercise
 * the order domain's triggers and constraints deterministically, which a suite
 * of writes against a live Turso database could not do without mutating real
 * rows.
 */

const migrationsDir = path.join(
  process.cwd(),
  "packages/data-core/src/domains/marketplace-orders/db/migrations",
);

export function createMemoryMarketplaceDb(): MarketplaceDb {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const file of fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    sqlite.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  const db: MarketplaceDb = {
    async execute(sql, args = []) {
      const values = args.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
      const s = sqlite.prepare(sql);
      return /^\s*(SELECT|WITH|PRAGMA)/i.test(sql)
        ? (s.all(...values) as any)
        : [{ changes: s.run(...values).changes }];
    },
    async transaction(work) {
      sqlite.exec("BEGIN");
      try {
        const result = await work(db);
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return db;
}
