import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { MarketplaceDb } from "../ports/marketplace-order-store";

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
