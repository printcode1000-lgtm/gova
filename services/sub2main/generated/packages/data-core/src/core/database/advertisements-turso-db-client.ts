import { nodeRequire } from '../node-require';
import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { getTursoAdvertisementsClient } from '../turso/advertisements-turso-client';
import { AbstractDatabaseClient } from './abstract-database-client';

export class AdvertisementsTursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = nodeRequire('drizzle-orm/libsql');
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
