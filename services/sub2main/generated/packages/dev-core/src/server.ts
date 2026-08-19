import path from "node:path";

import {
  ADVERTISEMENTS_SQLITE_FILE,
  MARKETPLACE_ORDERS_SOURCE_SQLITE_FILE,
  NOTIFICATIONS_SQLITE_FILE,
  PRIMARY_SQLITE_FILE,
  PRODUCT_SQLITE_FILE,
  PROFILE_SOURCE_SQLITE_FILE,
} from "./domain/database-files";
import {
  LOCAL_IMAGES_SEGMENT,
  LOCAL_SQLITE_SEGMENT,
  LOCAL_SYNC_DATA_SEGMENT,
  LOCAL_SYNC_FILE_PUBLIC_PREFIX,
  LOCAL_SYNC_FILE_SEGMENT,
  SCHEMA_SYNC_REPORT_SEGMENT,
} from "./domain/paths";
import { buildLocalSyncFilePublicUrl } from "./domain/public-url";
import { sqliteFileNameForShard } from "./domain/shards";
import type { LocalDevelopmentRuntimeInput } from "./guards/development-guard";

function resolveFromCwd(cwd: string, ...segments: string[]): string {
  return path.join(cwd, ...segments);
}

export function resolveSyncDataDirectory(cwd: string = process.cwd()): string {
  return resolveFromCwd(cwd, LOCAL_SYNC_DATA_SEGMENT);
}

export function resolveSqliteDirectory(cwd: string = process.cwd()): string {
  return resolveFromCwd(cwd, LOCAL_SQLITE_SEGMENT);
}

export function resolveSyncFileRoot(cwd: string = process.cwd()): string {
  return resolveFromCwd(cwd, LOCAL_SYNC_FILE_SEGMENT);
}

export function resolveLocalImagesRoot(cwd: string = process.cwd()): string {
  return resolveFromCwd(cwd, LOCAL_IMAGES_SEGMENT);
}

export function resolveSchemaSyncReportPath(cwd: string = process.cwd()): string {
  return resolveFromCwd(cwd, SCHEMA_SYNC_REPORT_SEGMENT);
}

export function resolvePrimarySqlitePath(cwd: string = process.cwd()): string {
  return path.join(resolveSqliteDirectory(cwd), PRIMARY_SQLITE_FILE);
}

export function resolveProfileSourceSqlitePath(cwd: string = process.cwd()): string {
  return path.join(resolveSqliteDirectory(cwd), PROFILE_SOURCE_SQLITE_FILE);
}

export function resolveProductSqlitePath(cwd: string = process.cwd()): string {
  return path.join(resolveSqliteDirectory(cwd), PRODUCT_SQLITE_FILE);
}

export function resolveAdvertisementsSqlitePath(cwd: string = process.cwd()): string {
  return path.join(resolveSqliteDirectory(cwd), ADVERTISEMENTS_SQLITE_FILE);
}

export function resolveNotificationsSqlitePath(cwd: string = process.cwd()): string {
  return path.join(resolveSqliteDirectory(cwd), NOTIFICATIONS_SQLITE_FILE);
}

export function resolveMarketplaceOrdersSourceSqlitePath(
  cwd: string = process.cwd(),
): string {
  return path.join(resolveSqliteDirectory(cwd), MARKETPLACE_ORDERS_SOURCE_SQLITE_FILE);
}

export function resolveShardSqlitePath(
  databaseName: string,
  cwd: string = process.cwd(),
): string {
  return path.join(resolveSqliteDirectory(cwd), sqliteFileNameForShard(databaseName));
}

export {
  LOCAL_IMAGES_SEGMENT,
  LOCAL_SQLITE_SEGMENT,
  LOCAL_SYNC_DATA_SEGMENT,
  LOCAL_SYNC_FILE_PUBLIC_PREFIX,
  LOCAL_SYNC_FILE_SEGMENT,
  SCHEMA_SYNC_REPORT_SEGMENT,
} from "./domain/paths";

export {
  ADVERTISEMENTS_SQLITE_FILE,
  LOCAL_RUNTIME_SQLITE_FILES,
  MARKETPLACE_ORDERS_SOURCE_SQLITE_FILE,
  NOTIFICATIONS_SQLITE_FILE,
  PRIMARY_SQLITE_FILE,
  PRODUCT_SQLITE_FILE,
  PROFILE_SOURCE_SQLITE_FILE,
} from "./domain/database-files";

export { sqliteFileNameForShard } from "./domain/shards";

export { buildLocalSyncFilePublicUrl } from "./domain/public-url";

export {
  assertLocalDevelopmentAllowed,
  assertStrictLocalDevelopmentAllowed,
  buildLocalDevelopmentEnvironment,
  isLocalDevelopmentRuntime,
  isStrictLocalDevelopmentRuntime,
  type AppDeployment,
  type LocalDevelopmentEnvironment,
  type LocalDevelopmentRuntimeInput,
} from "./guards/development-guard";

export function readLocalDevelopmentRuntimeFromProcess(
  runtime: Pick<LocalDevelopmentRuntimeInput, "isDevelopment" | "deployment">,
  env: NodeJS.ProcessEnv = process.env,
): LocalDevelopmentRuntimeInput {
  return {
    isDevelopment: runtime.isDevelopment,
    deployment: runtime.deployment,
    nodeEnv: env.NODE_ENV,
    publicMode: env.NEXT_PUBLIC_ASOL_MODE,
    vercel: env.VERCEL === "1" || Boolean(env.VERCEL_ENV),
    nextPhase: env.NEXT_PHASE,
  };
}
