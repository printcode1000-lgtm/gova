import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '@/core/monitor/drizzle-dev-logger';
import { getTursoAdvertisementsClient } from '@/lib/db/turso-advertisements';
import { AbstractDatabaseClient } from './abstract-database-client';

export class AdvertisementsTursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = require('drizzle-orm/libsql');
    const client = getTursoAdvertisementsClient();
    this._db = drizzle(
      client,
      isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
    );

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoAdvertisementsClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
