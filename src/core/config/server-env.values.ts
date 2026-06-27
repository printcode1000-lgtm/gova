/**
 * Server-only secrets and credentials (Node / build scripts).
 * Next.js app code should import from server-env.ts instead.
 */

export function getTursoRuntimeCredentials(): { url: string; authToken: string } {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error('TURSO_DATABASE_URL environment variable is not set');
  if (!authToken) throw new Error('TURSO_AUTH_TOKEN environment variable is not set');

  return { url, authToken };
}

export function getTursoPlatformCredentials(): { apiToken: string; organization: string } {
  const apiToken = process.env.TURSO_API_TOKEN;
  const organization = process.env.TURSO_ORGANIZATION;

  if (!apiToken) throw new Error('TURSO_API_TOKEN is required for Turso provisioning');
  if (!organization) throw new Error('TURSO_ORGANIZATION is required for Turso provisioning');

  return { apiToken, organization };
}

export function getCorsOrigins(): string[] {
  const fromEnv = process.env.GOVA_CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  if (fromEnv?.length) return fromEnv;

  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'capacitor://localhost',
    'http://localhost',
    'ionic://localhost',
  ];
}

export function readOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

export function writeTursoRuntimeCredentials(url: string, authToken: string): void {
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = authToken;
}
