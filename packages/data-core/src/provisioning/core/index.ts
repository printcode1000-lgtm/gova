export {
  runSchemaSync,
  ignoredExtraTablesFor,
  runAllSchemaSyncs,
  getSchemaSyncReportPath,
  type AllSchemaSyncReports,
} from './schema-sync';
export { schemaSyncReportPathFor, SCHEMA_SYNC_REPORT_PATH } from './schema-sync-report-path';
export { provisionTursoDatabase, loadTursoCredentialsFromEnv } from './turso-provisioner';
export { readTursoSchema } from './turso-schema-reader';
export { diffSchemas } from './schema-diff';
export { computeSchemaVersion } from './schema-version';
export { credentialKeysFor, loadCredentialsFor } from './schema-credentials';
export type {
  SchemaSyncReport,
  SchemaDiffOperation,
  SchemaMigrationRequirement,
  DatabaseSchema,
  TursoProvisionResult,
} from './types';

/**
 * The desired-schema manifests are the provisioning SSOT.
 *
 * They are TypeScript the build already contains, so every consumer here — the
 * release apply step, the read-only verifier, the parity tests — calculates the
 * intended cloud schema without opening a database of any kind.
 */
export {
  DESIRED_SCHEMAS,
  LOGICAL_DATABASE_LABELS,
  NON_SHARD_DATABASE_LABELS,
  desiredTableOwnership,
  isLogicalDatabaseLabel,
  readDesiredSchema,
  type LogicalDatabaseLabel,
  type NonShardDatabaseLabel,
} from '../desired-schema/registry';

/** Provisioning also drives the release scripts that create the databases. */
export {
  provisionTursoProductDatabase,
  provisionTursoAdvertisementsDatabase,
  loadTursoProductCredentialsFromEnv,
  loadTursoAdvertisementsCredentialsFromEnv,
  loadTursoNotificationsCredentialsFromEnv,
} from './turso-provisioner';

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
  type DatabaseShardName,
} from '../../core/database/database-shards';
