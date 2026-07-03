import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import {
  createTursoDatabase,
  createTursoDatabaseToken,
  ensureTursoGroup,
  listTursoDatabases,
} from './turso-platform-api';
import { SQLITE_DIRECTORY } from '@/core/database/environment';
import { writeTursoRuntimeCredentials, writeTursoProfileRuntimeCredentials, readOptionalEnv } from '@/core/config/server-env.values';
import type { TursoProvisionResult } from './types';

const DEFAULT_USERS_DB_NAME = 'gova-db';
const DEFAULT_PROFILE_DB_NAME = 'gova-profile';

function updateEnvFileKeys(
  filePath: string,
  entries: Record<string, string>
): void {
  if (!existsSync(filePath)) return;

  let content = readFileSync(filePath, 'utf8');

  for (const [key, value] of Object.entries(entries)) {
    const pattern = new RegExp(`${key}=.*`);
    if (content.includes(`${key}=`)) {
      content = content.replace(pattern, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  writeFileSync(filePath, content, 'utf8');
}

function updateUsersEnvFiles(url: string, token: string): void {
  const entries = {
    TURSO_DATABASE_URL: url,
    TURSO_AUTH_TOKEN: token,
  };
  updateEnvFileKeys('.env', entries);
  updateEnvFileKeys('.env.local', entries);
}

function updateProfileEnvFiles(url: string, token: string): void {
  const entries = {
    TURSO_PROFILE_DATABASE_URL: url,
    TURSO_PROFILE_AUTH_TOKEN: token,
  };
  updateEnvFileKeys('.env', entries);
  updateEnvFileKeys('.env.local', entries);
}

export interface ProvisionTursoOptions {
  databaseName?: string;
  updateLocalEnv?: boolean;
}

/**
 * Ensures Turso users database exists and returns runtime credentials.
 * Uses Platform API only — never called during development runtime.
 */
export async function provisionTursoDatabase(
  options: ProvisionTursoOptions = {}
): Promise<TursoProvisionResult> {
  return provisionNamedTursoDatabase({
    ...options,
    databaseName: options.databaseName ?? DEFAULT_USERS_DB_NAME,
    onProvisioned: (url, token) => {
      if (options.updateLocalEnv !== false) {
        updateUsersEnvFiles(url, token);
      }
      writeTursoRuntimeCredentials(url, token);
    },
  });
}

export interface ProvisionTursoProfileOptions {
  databaseName?: string;
  updateLocalEnv?: boolean;
}

/**
 * Ensures Turso profile database exists and returns runtime credentials.
 */
export async function provisionTursoProfileDatabase(
  options: ProvisionTursoProfileOptions = {}
): Promise<TursoProvisionResult> {
  return provisionNamedTursoDatabase({
    ...options,
    databaseName: options.databaseName ?? DEFAULT_PROFILE_DB_NAME,
    onProvisioned: (url, token) => {
      if (options.updateLocalEnv !== false) {
        updateProfileEnvFiles(url, token);
      }
      writeTursoProfileRuntimeCredentials(url, token);
    },
  });
}

async function provisionNamedTursoDatabase(options: {
  databaseName: string;
  updateLocalEnv?: boolean;
  onProvisioned: (url: string, token: string) => void;
}): Promise<TursoProvisionResult> {
  const groupName = await ensureTursoGroup();

  const databases = await listTursoDatabases();
  let database: { Name: string; Hostname: string } | undefined = databases.find(
    (db) => db.Name === options.databaseName
  );
  let created = false;

  if (!database) {
    const createdDb = await createTursoDatabase(options.databaseName, groupName);
    database = { Name: options.databaseName, Hostname: createdDb.Hostname };
    created = true;
  }

  const databaseUrl = `libsql://${database.Hostname}`;
  const authToken = await createTursoDatabaseToken(options.databaseName);

  options.onProvisioned(databaseUrl, authToken);

  return {
    databaseUrl,
    authToken,
    databaseName: options.databaseName,
    created,
  };
}

export function loadTursoCredentialsFromEnv(): { url: string; authToken: string } | null {
  const url = readOptionalEnv('TURSO_DATABASE_URL');
  const authToken = readOptionalEnv('TURSO_AUTH_TOKEN');

  if (!url || !authToken) return null;
  return { url, authToken };
}

export function loadTursoProfileCredentialsFromEnv(): { url: string; authToken: string } | null {
  const url = readOptionalEnv('TURSO_PROFILE_DATABASE_URL');
  const authToken = readOptionalEnv('TURSO_PROFILE_AUTH_TOKEN');

  if (!url || !authToken) return null;
  return { url, authToken };
}

export function loadTursoAdvertisementsCredentialsFromEnv(): { url: string; authToken: string } | null {
  const url =
    readOptionalEnv('TURSO_ADVERTISEMENTS_DATABASE_URL') ||
    readOptionalEnv('TURSO_DATABASE_URL');
  const authToken =
    readOptionalEnv('TURSO_ADVERTISEMENTS_AUTH_TOKEN') ||
    readOptionalEnv('TURSO_AUTH_TOKEN');

  if (!url || !authToken) return null;
  return { url, authToken };
}

export function ensureSqliteDirectory(): void {
  if (!existsSync(SQLITE_DIRECTORY)) {
    mkdirSync(SQLITE_DIRECTORY, { recursive: true });
  }
}
