import 'server-only';

import { getTursoClient } from '../turso/users-turso-client';
import { AbstractDatabaseClient } from './abstract-database-client';

export class TursoDatabaseClient extends AbstractDatabaseClient {
  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
