import type { IDatabaseClient } from './database-client.interface';

/**
 * DatabaseClient
 *
 * The top-level driver selector. Uses lazy `require()` for both
 * SQLiteDatabaseClient and TursoDatabaseClient so neither package
 * is pulled into the client-side bundle at module-evaluation time.
 *
 * - Development  → SQLiteDatabaseClient (better-sqlite3 / sqlite-proxy)
 * - Production   → TursoDatabaseClient  (@libsql/client / Turso)
 *
 * Both packages are declared in `serverExternalPackages` in next.config.ts
 * so webpack never attempts to bundle them client-side.
 */
export class DatabaseClient implements IDatabaseClient {
  private activeClient: IDatabaseClient;

  constructor() {
    if (typeof window !== 'undefined') {
      // Browser: use browser-safe database client (no Node.js dependencies)
      const { BrowserDatabaseClient } = require('./browser-db-client');
      this.activeClient = new BrowserDatabaseClient();
    } else {
      // Server-only: safely require server-specific clients
      const isDev =
        process.env.NEXT_PUBLIC_GOVA_MODE === 'development' ||
        process.env.GOVA_MODE === 'development' ||
        process.env.NODE_ENV === 'development';

      if (isDev) {
        const { SQLiteDatabaseClient } = require('./sqlite-db-client');
        this.activeClient = new SQLiteDatabaseClient();
      } else {
        const { TursoDatabaseClient } = require('./turso-db-client');
        this.activeClient = new TursoDatabaseClient();
      }
    }
  }

  get db(): any {
    return this.activeClient.db;
  }

  async execute(sql: string, params?: any[]): Promise<any[]> {
    return this.activeClient.execute(sql, params);
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    return this.activeClient.insert(table, data);
  }

  async select(table: string, where: Record<string, any>, limit?: number): Promise<any[]> {
    return this.activeClient.select(table, where, limit);
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any> {
    return this.activeClient.update(table, data, where);
  }

  async delete(table: string, where: Record<string, any>): Promise<any> {
    return this.activeClient.delete(table, where);
  }
}

// Singleton — created once per server process / browser tab
export const dbClient: IDatabaseClient = new DatabaseClient();
