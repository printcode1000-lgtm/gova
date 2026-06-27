import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import {
  createTursoDatabase,
  createTursoDatabaseToken,
  ensureTursoGroup,
  listTursoDatabases,
} from './turso-platform-api';
import { SQLITE_DIRECTORY } from '@/core/database/environment';
import { writeTursoRuntimeCredentials, readOptionalEnv } from '@/core/config/server-env.values';
import type { TursoProvisionResult } from './types';

const DEFAULT_DB_NAME = 'gova-db';

function updateEnvFile(filePath: string, url: string, token: string): void {
  if (!existsSync(filePath)) return;

  let content = readFileSync(filePath, 'utf8');

  if (content.includes('TURSO_DATABASE_URL=')) {
    content = content.replace(/TURSO_DATABASE_URL=.*/, `TURSO_DATABASE_URL=${url}`);
  } else {
    content += `\nTURSO_DATABASE_URL=${url}`;
  }

  if (content.includes('TURSO_AUTH_TOKEN=')) {
    content = content.replace(/TURSO_AUTH_TOKEN=.*/, `TURSO_AUTH_TOKEN=${token}`);
  } else {
    content += `\nTURSO_AUTH_TOKEN=${token}`;
  }

  writeFileSync(filePath, content, 'utf8');
}

export interface ProvisionTursoOptions {
  databaseName?: string;
  updateLocalEnv?: boolean;
}

/**
 * Ensures Turso database exists and returns runtime credentials.
 * Uses Platform API only — never called during development runtime.
 */
export async function provisionTursoDatabase(
  options: ProvisionTursoOptions = {}
): Promise<TursoProvisionResult> {
  const databaseName = options.databaseName ?? DEFAULT_DB_NAME;
  const groupName = await ensureTursoGroup();

  const databases = await listTursoDatabases();
  let database: { Name: string; Hostname: string } | undefined = databases.find(
    (db) => db.Name === databaseName
  );
  let created = false;

  if (!database) {
    const createdDb = await createTursoDatabase(databaseName, groupName);
    database = { Name: databaseName, Hostname: createdDb.Hostname };
    created = true;
  }

  const databaseUrl = `libsql://${database.Hostname}`;
  const authToken = await createTursoDatabaseToken(databaseName);

  if (options.updateLocalEnv !== false) {
    updateEnvFile('.env', databaseUrl, authToken);
    updateEnvFile('.env.local', databaseUrl, authToken);
  }

  writeTursoRuntimeCredentials(databaseUrl, authToken);

  return {
    databaseUrl,
    authToken,
    databaseName,
    created,
  };
}

export function loadTursoCredentialsFromEnv(): { url: string; authToken: string } | null {
  const url = readOptionalEnv('TURSO_DATABASE_URL');
  const authToken = readOptionalEnv('TURSO_AUTH_TOKEN');

  if (!url || !authToken) return null;
  return { url, authToken };
}

export function ensureSqliteDirectory(): void {
  if (!existsSync(SQLITE_DIRECTORY)) {
    mkdirSync(SQLITE_DIRECTORY, { recursive: true });
  }
}
