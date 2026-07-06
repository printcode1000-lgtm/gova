import "server-only";

import { isDevelopment } from "@/core/config";
import { createDrizzleDevLogger } from "@/core/monitor/drizzle-dev-logger";
import { AbstractDatabaseClient } from "./abstract-database-client";
import { PRODUCT_SQLITE_DB_PATH } from "./environment";

export class ProductSQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    const Database = require("better-sqlite3");
    const sqlite = new Database(PRODUCT_SQLITE_DB_PATH);
    sqlite.pragma("foreign_keys = ON");
    this._db = drizzle(
      sqlite,
      isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
    );
    require("./ensure-product-migrations").ensureProductDevMigrations(this._db);
    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    void this.db;
    const Database = require("better-sqlite3");
    const db = new Database(PRODUCT_SQLITE_DB_PATH);
    db.pragma("foreign_keys = ON");
    try {
      const statement = db.prepare(sql);
      return sql.trim().toUpperCase().startsWith("SELECT")
        ? statement.all(...params)
        : [statement.run(...params)];
    } finally {
      db.close();
    }
  }
}
