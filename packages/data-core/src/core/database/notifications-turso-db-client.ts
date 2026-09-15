import 'server-only';

import { getTursoNotificationsClient } from '../turso/notifications-turso-client';
import { AbstractDatabaseClient } from './abstract-database-client';

export class NotificationsTursoDatabaseClient extends AbstractDatabaseClient {
  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoNotificationsClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
