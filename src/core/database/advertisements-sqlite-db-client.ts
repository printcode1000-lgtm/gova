import "server-only";

import { isDevelopment } from "@/core/config";
import { createDrizzleDevLogger } from "@/core/monitor/drizzle-dev-logger";
import { ADVERTISEMENTS_SQLITE_DB_PATH } from "./environment";
import { AbstractDatabaseClient } from "./abstract-database-client";

export class AdvertisementsSQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    const Database = require("better-sqlite3");
    const sqlite = new Database(ADVERTISEMENTS_SQLITE_DB_PATH);
    this._db = drizzle(
      sqlite,
      isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
    );
    const {
      ensureAdvertisementsDevMigrations,
    } = require("./ensure-advertisements-migrations");
    ensureAdvertisementsDevMigrations(this._db);
    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const Database = require("better-sqlite3");
    const db = new Database(ADVERTISEMENTS_SQLITE_DB_PATH);
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
