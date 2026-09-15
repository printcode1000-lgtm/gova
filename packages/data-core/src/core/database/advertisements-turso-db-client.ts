import 'server-only';

import { getTursoAdvertisementsClient } from '../turso/advertisements-turso-client';
import { AbstractDatabaseClient } from './abstract-database-client';

export class AdvertisementsTursoDatabaseClient extends AbstractDatabaseClient {
  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoAdvertisementsClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
