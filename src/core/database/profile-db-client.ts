import 'server-only';

import type { IDatabaseClient } from './database-client.interface';
import { isDevRuntime } from './environment';

/**
 * ProfileDatabaseClient — server-only driver selector for the sharded profile databases.
 */
export class ProfileDatabaseClient implements IDatabaseClient {
  private activeClient: IDatabaseClient;

  constructor() {
    if (isDevRuntime()) {
      const { ProfileShardedDatabaseClient } = require('./profile-sharded-db-client');
      this.activeClient = new ProfileShardedDatabaseClient();
    } else {
      const { ProfileShardedDatabaseClient } = require('./profile-sharded-db-client');
      this.activeClient = new ProfileShardedDatabaseClient();
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

export const profileDbClient: IDatabaseClient = new ProfileDatabaseClient();
