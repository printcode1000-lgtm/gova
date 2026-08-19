import { nodeRequire } from '../node-require';
import { ensureAdvertisementsDevMigrations } from './ensure-advertisements-migrations';
import "server-only";

import { isDevelopment } from "@/core/config";
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { ADVERTISEMENTS_SQLITE_DB_PATH } from "./environment";
import { AbstractDatabaseClient } from "./abstract-database-client";

export class AdvertisementsSQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;
    const { drizzle } = nodeRequire("drizzle-orm/better-sqlite3");
    const Database = nodeRequire("better-sqlite3");
    const sqlite = new Database(ADVERTISEMENTS_SQLITE_DB_PATH);
    this._db = drizzle(
      sqlite,
      isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
    );
    ensureAdvertisementsDevMigrations(this._db);
    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const Database = nodeRequire("better-sqlite3");
    const db = new Database(ADVERTISEMENTS_SQLITE_DB_PATH);
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
