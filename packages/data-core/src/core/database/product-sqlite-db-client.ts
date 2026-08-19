import { nodeRequire } from '../node-require';
import { ensureProductDevMigrations } from './ensure-product-migrations';
import "server-only";

import { isDevelopment } from "@/core/config";
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { AbstractDatabaseClient } from "./abstract-database-client";
import { PRODUCT_SQLITE_DB_PATH } from "./environment";

export class ProductSQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;
    const { drizzle } = nodeRequire("drizzle-orm/better-sqlite3");
    const Database = nodeRequire("better-sqlite3");
    const sqlite = new Database(PRODUCT_SQLITE_DB_PATH);
    sqlite.pragma("foreign_keys = ON");
    this._db = drizzle(
      sqlite,
      isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
    );
    ensureProductDevMigrations(this._db);
    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    void this.db;
    const Database = nodeRequire("better-sqlite3");
    const db = new Database(PRODUCT_SQLITE_DB_PATH);
    db.pragma("foreign_keys = ON");
    try {
      const statement = db.prepare(sql);
      return sql.trim().toUpperCase().startsWith("SELECT") ||
        /\bRETURNING\b/i.test(sql)
        ? statement.all(...params)
        : [statement.run(...params)];
    } finally {
      db.close();
    }
  }
}
