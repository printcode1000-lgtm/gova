import 'server-only';

import { createClient } from '@libsql/client';

import { createOtaReleaseRepository } from './domains/ota/repositories/ota-release-repository';
import type { IDatabaseClient } from './core/database/database-client.interface';

/**
 * Exact primary-Turso adapter for OTA administration in the control runtime.
 *
 * The connection is opened on first use, not in the constructor. Building it
 * eagerly made `TURSO_DATABASE_URL` a requirement for *importing* this door,
 * which is not the same thing as querying through it: Next's build collects
 * every route's module graph, so the OTA admin routes failed to build on a
 * machine that simply had no database configured.
 */
class ControlOtaDatabaseClient implements IDatabaseClient {
  private connection: ReturnType<typeof createClient> | null = null;

  private get client(): ReturnType<typeof createClient> {
    this.connection ??= createClient({
      url: required('TURSO_DATABASE_URL'),
      authToken: required('TURSO_AUTH_TOKEN'),
    });
    return this.connection;
  }

  async execute(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const result = await this.client.execute({ sql, args: params as any[] });
    return result.rows as Record<string, unknown>[];
  }
  async insert(): Promise<never> { throw new Error('controlOtaDatabase: use execute'); }
  async select(): Promise<never> { throw new Error('controlOtaDatabase: use execute'); }
  async update(): Promise<never> { throw new Error('controlOtaDatabase: use execute'); }
  async delete(): Promise<never> { throw new Error('controlOtaDatabase: use execute'); }
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

export function createControlOtaReleaseRepository() {
  return createOtaReleaseRepository(new ControlOtaDatabaseClient());
}
