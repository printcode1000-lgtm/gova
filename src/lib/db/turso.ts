import { createClient } from '@libsql/client';

let tursoClient: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (tursoClient) return tursoClient;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is not set');
  }

  if (!authToken) {
    throw new Error('TURSO_AUTH_TOKEN environment variable is not set');
  }

  tursoClient = createClient({
    url,
    authToken,
  });

  return tursoClient;
}

export async function queryTurso<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const client = getTursoClient();
  const result = await client.execute({ sql, args: params });
  return result.rows as T[];
}

export async function executeTurso(sql: string, params: any[] = []): Promise<void> {
  const client = getTursoClient();
  await client.execute({ sql, args: params });
}
