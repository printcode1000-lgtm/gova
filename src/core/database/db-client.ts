import 'server-only';

import type { IDatabaseClient } from './database-client.interface';
import { isDevRuntime } from './environment';

/**
 * DatabaseClient — server-only driver selector.
 *
 * Development runtime  → SQLite (public/sync_data/sync_sqlite)
 * Production runtime   → Turso (@libsql/client)
 *
 * Browser, Static Export, and Capacitor never instantiate this class.
 * They consume the ASOL backend through AsolApiClient only.
 */
export class DatabaseClient implements IDatabaseClient {
  private activeClient: IDatabaseClient;

  constructor() {
    if (isDevRuntime()) {
      const { SQLiteDatabaseClient } = require('./sqlite-db-client');
      this.activeClient = new SQLiteDatabaseClient();
    } else {
      const { TursoDatabaseClient } = require('./turso-db-client');
      this.activeClient = new TursoDatabaseClient();
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

export const dbClient: IDatabaseClient = new DatabaseClient();
