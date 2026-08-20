import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { getTursoAdvertisementsClient } from '../turso/advertisements-turso-client';
import { AbstractDatabaseClient } from './abstract-database-client';
import { drizzle } from './drizzle-libsql.server';

export class AdvertisementsTursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const client = getTursoAdvertisementsClient();
    this._db = isDevelopment
      ? drizzle(client, { logger: createDrizzleDevLogger() })
      : drizzle(client);

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoAdvertisementsClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
