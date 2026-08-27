import { nodeRequire } from '../node-require';
import { ensureAdvertisementsDevMigrations } from './ensure-advertisements-migrations';
import "server-only";

import { dataCoreRuntimeConfig } from '../../ports/runtime-config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { ADVERTISEMENTS_SQLITE_DB_PATH } from "./environment";
import { AbstractDatabaseClient } from "./abstract-database-client";
import { CachedSqliteConnection } from "./cached-sqlite-connection";

export class AdvertisementsSQLiteDatabaseClient extends AbstractDatabaseClient {
  private readonly connection = new CachedSqliteConnection(
    ADVERTISEMENTS_SQLITE_DB_PATH,
    (databasePath) => new (nodeRequire("better-sqlite3"))(databasePath),
    (sqlite) => {
      const { drizzle } = nodeRequire("drizzle-orm/better-sqlite3");
      const db = drizzle(
        sqlite,
        dataCoreRuntimeConfig().isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
      );
      ensureAdvertisementsDevMigrations(db);
      return db;
    },
  );

  get db(): any {
    return this.connection.get();
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
