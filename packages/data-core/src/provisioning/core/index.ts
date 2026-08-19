export { getSchemaSyncReportPublicUrl } from './schema-sync-report-path';
export { runSchemaSync, getSchemaSyncReportPath } from './schema-sync';
export { provisionTursoDatabase, loadTursoCredentialsFromEnv, ensureSqliteDirectory } from './turso-provisioner';
export { readSqliteSchema } from './sqlite-schema-reader';
export { readTursoSchema } from './turso-schema-reader';
export { diffSchemas } from './schema-diff';
export { computeSchemaVersion } from './schema-version';
export type {
  SchemaSyncReport,
  SchemaDiffOperation,
  DatabaseSchema,
  TursoProvisionResult,
} from './types';

/** Provisioning also drives the two release scripts that create and fill the shards. */
export {
  provisionTursoProductDatabase,
  provisionTursoAdvertisementsDatabase,
  loadTursoProductCredentialsFromEnv,
  loadTursoAdvertisementsCredentialsFromEnv,
  loadTursoNotificationsCredentialsFromEnv,
} from './turso-provisioner';
export { runAllSchemaSyncs, type AllSchemaSyncReports } from './schema-sync';

/**
 * Shard identity is provisioning metadata, not a database driver: it names the shards and
 * the environment-variable prefix each one reads. `push-vercel-turso-env` needs exactly
 * this and nothing else, which is why it does not go through `./core`.
 */
export {
  DATABASE_SHARD_NAMES,
  DATABASE_SHARDS,
  PROFILE_SHARD_DATABASE_NAMES,
  MARKETPLACE_ORDER_SHARD_DATABASE_NAMES,
  envPrefixForShard,
  sqliteFileNameForShard,
  type DatabaseShardName,
} from '../../core/database/database-shards';
