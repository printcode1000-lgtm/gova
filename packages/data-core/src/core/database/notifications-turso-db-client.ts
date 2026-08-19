import { nodeRequire } from '../node-require';
import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { getTursoNotificationsClient } from '../turso/notifications-turso-client';
import { AbstractDatabaseClient } from './abstract-database-client';

export class NotificationsTursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = nodeRequire('drizzle-orm/libsql');
    const client = getTursoNotificationsClient();
    this._db = drizzle(
      client,
      isDevelopment ? { logger: createDrizzleDevLogger() } : undefined,
    );

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoNotificationsClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
