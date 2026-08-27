import { nodeRequire } from '../node-require';
import { ensureProductDevMigrations } from './ensure-product-migrations';
import "server-only";

import { dataCoreRuntimeConfig } from '../../ports/runtime-config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { AbstractDatabaseClient } from "./abstract-database-client";
import { CachedSqliteConnection } from "./cached-sqlite-connection";
import { PRODUCT_SQLITE_DB_PATH } from "./environment";
import { executeSqliteStatement } from "./sqlite-statement-execution";

export class ProductSQLiteDatabaseClient extends AbstractDatabaseClient {
  private readonly connection = new CachedSqliteConnection(
    PRODUCT_SQLITE_DB_PATH,
    (databasePath) => {
      const sqlite = new (nodeRequire("better-sqlite3"))(databasePath);
      sqlite.pragma("foreign_keys = ON");
      return sqlite;
    },
    (sqlite) => {
      const { drizzle } = nodeRequire("drizzle-orm/better-sqlite3");
      const db = drizzle(
        sqlite,
        dataCoreRuntimeConfig().isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
      );
      ensureProductDevMigrations(db);
      return db;
    },
  );

  get db(): any {
    return this.connection.get();
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    void this.db;
    const Database = nodeRequire("better-sqlite3");
    const db = new Database(PRODUCT_SQLITE_DB_PATH);
    db.pragma("foreign_keys = ON");
    try {
      return executeSqliteStatement(db.prepare(sql), params);
    } finally {
      db.close();
    }
  }
}
