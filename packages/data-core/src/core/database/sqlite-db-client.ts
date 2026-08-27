import { nodeRequire } from '../node-require';
import { ensureDevMigrations } from './ensure-migrations';
import 'server-only';

import { dataCoreRuntimeConfig } from '../../ports/runtime-config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { AbstractDatabaseClient } from './abstract-database-client';
import { CachedSqliteConnection } from './cached-sqlite-connection';
import { PRIMARY_SQLITE_DB_PATH } from './environment';
import { executeSqliteStatement } from './sqlite-statement-execution';

export class SQLiteDatabaseClient extends AbstractDatabaseClient {
  private readonly connection = new CachedSqliteConnection(
    PRIMARY_SQLITE_DB_PATH,
    (databasePath) => new (nodeRequire('better-sqlite3'))(databasePath),
    (sqlite) => {
      const { drizzle } = nodeRequire('drizzle-orm/better-sqlite3');
      const db = drizzle(
        sqlite,
        dataCoreRuntimeConfig().isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
      );
      ensureDevMigrations(db);
      return db;
    },
  );

  get db(): any {
    return this.connection.get();
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const Database = nodeRequire('better-sqlite3');
    const db = new Database(PRIMARY_SQLITE_DB_PATH);

    try {
      return executeSqliteStatement(db.prepare(sql), params);
    } finally {
      db.close();
    }
  }
}
