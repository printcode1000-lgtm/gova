import 'server-only';

import { pushDevTrace } from './server-trace';
import { inferOperationType } from './types';

export function createDrizzleDevLogger() {
  return {
    logQuery(query: string, params: unknown[]): void {
      const startedAt = Date.now();
      pushDevTrace({
        layer: 'database',
        name: 'Drizzle ORM',
        operationType: inferOperationType(query),
        sql: query,
        table: extractTableFromSql(query),
        executionTimeMs: Date.now() - startedAt,
        status: 'success',
      });
      void params;
    },
  };
}

function extractTableFromSql(sql: string): string {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('SELECT')) {
    const match = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
    return match?.[1] ?? '';
  }
  if (upper.startsWith('INSERT')) {
    const match = sql.match(/INTO\s+["'`]?(\w+)["'`]?/i);
    return match?.[1] ?? '';
  }
  if (upper.startsWith('UPDATE')) {
    const match = sql.match(/UPDATE\s+["'`]?(\w+)["'`]?/i);
    return match?.[1] ?? '';
  }
  if (upper.startsWith('DELETE')) {
    const match = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
    return match?.[1] ?? '';
  }
  return '';
}
