import type { IDatabaseClient } from './database-client.interface';
import { SQLiteDatabaseClient } from './sqlite-db-client';
import { TursoDatabaseClient } from './turso-db-client';

export class DatabaseClient implements IDatabaseClient {
  private activeClient: IDatabaseClient;

  constructor() {
    const isDev = 
      process.env.NEXT_PUBLIC_GOVA_MODE === 'development' ||
      process.env.GOVA_MODE === 'development' ||
      process.env.NODE_ENV === 'development';

    if (isDev) {
      this.activeClient = new SQLiteDatabaseClient();
    } else {
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

// Export singleton client
export const dbClient: IDatabaseClient = new DatabaseClient();
