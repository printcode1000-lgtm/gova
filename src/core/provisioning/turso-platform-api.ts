/**
 * Turso Platform API client — the ONLY place that uses TURSO_API_TOKEN.
 * Used exclusively during build/deployment provisioning, never at runtime.
 */

import { asolHttpFetch } from '@/core/api/asol-http-transport';
import { getTursoPlatformCredentials } from '@/core/config/server-env.values';

const PLATFORM_API_BASE = 'https://api.turso.tech/v1';

function getPlatformHeaders(): HeadersInit {
  const { apiToken } = getTursoPlatformCredentials();
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

function getOrganization(): string {
  return getTursoPlatformCredentials().organization;
}

async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await asolHttpFetch(`${PLATFORM_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getPlatformHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Turso Platform API error (${response.status}): ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

export async function listTursoGroups(): Promise<Array<{ name: string }>> {
  const organization = getOrganization();
  const data = await platformFetch<{ groups?: Array<{ name: string }> }>(
    `/organizations/${organization}/groups`
  );
  return data.groups ?? [];
}

export async function createTursoGroup(name: string, location: string): Promise<void> {
  const organization = getOrganization();
  await platformFetch(`/organizations/${organization}/groups`, {
    method: 'POST',
    body: JSON.stringify({ name, location }),
  });
}

export async function listTursoLocations(): Promise<string[]> {
  const data = await platformFetch<{ locations?: Record<string, unknown> }>('/locations');
  return Object.keys(data.locations ?? {});
}

export async function listTursoDatabases(): Promise<Array<{ Name: string; Hostname: string }>> {
  const organization = getOrganization();
  const data = await platformFetch<{ databases?: Array<{ Name: string; Hostname: string }> }>(
    `/organizations/${organization}/databases`
  );
  return data.databases ?? [];
}

export async function createTursoDatabase(
  name: string,
  group: string
): Promise<{ Hostname: string }> {
  const organization = getOrganization();
  const data = await platformFetch<{ database: { Hostname: string } }>(
    `/organizations/${organization}/databases`,
    {
      method: 'POST',
      body: JSON.stringify({ name, group }),
    }
  );
  return data.database;
}

export async function createTursoDatabaseToken(databaseName: string): Promise<string> {
  const organization = getOrganization();
  const data = await platformFetch<{ jwt: string }>(
    `/organizations/${organization}/databases/${databaseName}/auth/tokens?expiration=never&authorization=full-access`,
    { method: 'POST' }
  );
  return data.jwt;
}

export async function ensureTursoGroup(preferredName = 'default'): Promise<string> {
  const groups = await listTursoGroups();
  if (groups.length > 0) {
    return groups[0].name;
  }

  const locations = await listTursoLocations();
  const location = locations[0] ?? 'iad';
  await createTursoGroup(preferredName, location);
  return preferredName;
}
