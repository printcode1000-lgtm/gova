// @libsql/client is a Node.js-only package.
// It is listed in serverExternalPackages in next.config.ts to prevent
// Next.js from bundling it client-side.
// This module is only ever imported in server contexts (API routes, server components).

let tursoClientInstance: any | null = null;

export function getTursoClient(): any {
  if (tursoClientInstance) return tursoClientInstance;

  if (typeof window !== 'undefined') {
    throw new Error(
      'getTursoClient() must only be called on the server. ' +
      'Use the /api/db route in browser environments.'
    );
  }

  // Dynamic require keeps the import server-only at bundling time
  const { createClient } = require('@libsql/client');

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error('TURSO_DATABASE_URL environment variable is not set');
  if (!authToken) throw new Error('TURSO_AUTH_TOKEN environment variable is not set');

  tursoClientInstance = createClient({ url, authToken });
  return tursoClientInstance;
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
