import { nodeRequire } from '../node-require';
import { ensureNotificationsDevMigrations } from './ensure-notifications-migrations';
import "server-only";

import { dataCoreRuntimeConfig } from '../../ports/runtime-config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { NOTIFICATIONS_SQLITE_DB_PATH } from "./environment";
import { AbstractDatabaseClient } from "./abstract-database-client";

export class NotificationsSQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;
    const { drizzle } = nodeRequire("drizzle-orm/better-sqlite3");
    const Database = nodeRequire("better-sqlite3");
    const sqlite = new Database(NOTIFICATIONS_SQLITE_DB_PATH);
    this._db = drizzle(
      sqlite,
      dataCoreRuntimeConfig().isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
    );
    ensureNotificationsDevMigrations(this._db);
    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const Database = nodeRequire("better-sqlite3");
    const db = new Database(NOTIFICATIONS_SQLITE_DB_PATH);
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
