import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '@/core/monitor/drizzle-dev-logger';
import { getTursoProfileClient } from '@/lib/db/turso-profile';
import { AbstractDatabaseClient } from './abstract-database-client';

export class ProfileTursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = require('drizzle-orm/libsql');
    const client = getTursoProfileClient();
    this._db = drizzle(client, isDevelopment ? { logger: createDrizzleDevLogger() } : undefined);

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoProfileClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
