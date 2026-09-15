import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
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
  const client = createClient({ url: "file::memory:" });
  const ready = (async () => {
    await client.execute("PRAGMA foreign_keys = ON");
    for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8")
        .replaceAll("--> statement-breakpoint", "\n");
      await client.executeMultiple(sql);
    }
  })();
  const db: MarketplaceDb = {
    async execute(sql, args = []) {
      await ready;
      const result = await client.execute({ sql, args: args as any[] });
      return result.rows.map((row) => ({ ...row })) as Record<string, unknown>[];
    },
    async transaction(work) {
      await ready;
      return work(db);
    },
  };
  return db;
}
