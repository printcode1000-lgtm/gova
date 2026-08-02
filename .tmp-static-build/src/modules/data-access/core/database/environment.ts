import path from "path";
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

export const SCHEMA_SYNC_REPORT_PATH = path.join(
  process.cwd(),
  "public",
  "sync_data",
  "schema-sync-report.json",
);

export const SQLITE_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "sync_data",
  "sync_sqlite",
);

export const PRIMARY_SQLITE_DB_PATH = path.join(
  SQLITE_DIRECTORY,
  "allusers.db",
);

export const PROFILE_SOURCE_SQLITE_DB_PATH = path.join(
  SQLITE_DIRECTORY,
  "profile.db",
);

export const PRODUCT_SQLITE_DB_PATH = path.join(SQLITE_DIRECTORY, "product.db");

export const ADVERTISEMENTS_SQLITE_DB_PATH = path.join(
  SQLITE_DIRECTORY,
  "advertisements.db",
);

export const MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH = path.join(
  SQLITE_DIRECTORY,
  "marketplace-orders.db",
);
