import {
  resolveAdvertisementsSqlitePath,
  resolveMarketplaceOrdersSourceSqlitePath,
  resolveNotificationsSqlitePath,
  resolvePrimarySqlitePath,
  resolveProductSqlitePath,
  resolveProfileSourceSqlitePath,
  resolveSchemaSyncReportPath,
  resolveSqliteDirectory,
} from "@asol/dev-core/server";
import {
  getServerRuntimeContext,
} from "@/core/config/runtime-context.server";
import {
  resolveServerDatabaseBackend,
  type ServerDatabaseBackend,
} from "@/modules/data-access/core/database-runtime-policy";

export type { ServerDatabaseBackend };

export function getServerDatabaseBackend(): ServerDatabaseBackend {
  return resolveServerDatabaseBackend(
    getServerRuntimeContext(),
    typeof window !== "undefined",
  );
}

export function assertServerDataAccessRuntime(): void {
  getServerDatabaseBackend();
}

export function isDevRuntime(): boolean {
  return getServerDatabaseBackend() === "sqlite";
}

export function isStaticExportBuild(): boolean {
  return getServerRuntimeContext().isStatic;
}

export function isProvisioningContext(): boolean {
  return getServerRuntimeContext().isProvisioning;
}

export const SCHEMA_SYNC_REPORT_PATH = resolveSchemaSyncReportPath();

export const SQLITE_DIRECTORY = resolveSqliteDirectory();

export const PRIMARY_SQLITE_DB_PATH = resolvePrimarySqlitePath();

export const PROFILE_SOURCE_SQLITE_DB_PATH = resolveProfileSourceSqlitePath();

export const PRODUCT_SQLITE_DB_PATH = resolveProductSqlitePath();

export const ADVERTISEMENTS_SQLITE_DB_PATH = resolveAdvertisementsSqlitePath();

/**
 * Device tokens and delivery preferences. Separate from allusers.db because the
 * production copy lives in its own Turso account.
 */
export const NOTIFICATIONS_SQLITE_DB_PATH = resolveNotificationsSqlitePath();

export const MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH =
  resolveMarketplaceOrdersSourceSqlitePath();
