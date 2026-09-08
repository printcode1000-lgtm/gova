import { envPrefixForShard, DATABASE_SHARD_NAMES, type DatabaseShardName } from '../../core/database/database-shards';
import { readOptionalEnv } from '../../ports/runtime-config';
import {
  loadTursoAdvertisementsCredentialsFromEnv,
  loadTursoCredentialsFromEnv,
  loadTursoNotificationsCredentialsFromEnv,
  loadTursoProductCredentialsFromEnv,
} from './turso-provisioner';
import type { LogicalDatabaseLabel } from '../desired-schema/registry';
import type { TursoCredentials } from './types';

/**
 * Which environment keys hold a logical database's credentials, and how to read
 * them.
 *
 * One place, because the answer is asked three times — schema verification,
 * schema application, and provisioning — and a label that resolved to different
 * keys in two of them would apply DDL to the wrong database while reporting the
 * right one.
 */

function shardCredentials(label: DatabaseShardName): TursoCredentials | null {
  const prefix = envPrefixForShard(label);
  const url = readOptionalEnv(`${prefix}_DATABASE_URL`);
  const authToken = readOptionalEnv(`${prefix}_DATABASE_AUTH_TOKEN`);
  if (!url || !authToken) return null;
  return { url, authToken };
}

function isShard(label: string): label is DatabaseShardName {
  return (DATABASE_SHARD_NAMES as readonly string[]).includes(label);
}

export function loadCredentialsFor(label: LogicalDatabaseLabel): TursoCredentials | null {
  switch (label) {
    case 'users':
      return loadTursoCredentialsFromEnv();
    case 'product':
      return loadTursoProductCredentialsFromEnv();
    case 'advertisements':
      return loadTursoAdvertisementsCredentialsFromEnv();
    case 'notifications':
      return loadTursoNotificationsCredentialsFromEnv();
    default:
      return isShard(label) ? shardCredentials(label) : null;
  }
}

/** The environment keys a label needs, named for the operator who has to set them. */
export function credentialKeysFor(label: LogicalDatabaseLabel): string {
  switch (label) {
    case 'users':
      return 'TURSO_DATABASE_URL / TURSO_AUTH_TOKEN';
    case 'product':
      return 'TURSO_PRODUCT_DATABASE_URL / TURSO_PRODUCT_AUTH_TOKEN';
    case 'advertisements':
      return 'TURSO_ADVERTISEMENTS_DATABASE_URL / TURSO_ADVERTISEMENTS_AUTH_TOKEN';
    case 'notifications':
      return 'TURSO_NOTIFICATIONS_DATABASE_URL / TURSO_NOTIFICATIONS_AUTH_TOKEN';
    default: {
      if (!isShard(label)) return `unknown database "${label}"`;
      const prefix = envPrefixForShard(label);
      return `${prefix}_DATABASE_URL / ${prefix}_DATABASE_AUTH_TOKEN`;
    }
  }
}
