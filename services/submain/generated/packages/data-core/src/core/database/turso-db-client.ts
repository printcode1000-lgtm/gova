import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { getTursoClient } from '../turso/users-turso-client';
import { AbstractDatabaseClient } from './abstract-database-client';
import { drizzle } from './drizzle-libsql.server';

export class TursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const client = getTursoClient();
    this._db = isDevelopment
      ? drizzle(client, { logger: createDrizzleDevLogger() })
      : drizzle(client);

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
