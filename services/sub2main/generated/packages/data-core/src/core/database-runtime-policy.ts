/**
 * Minimal runtime shape needed to decide whether server database access is
 * legal at all.
 *
 * Mirrors the fields of app `AppRuntimeContext` without importing `@/`. It
 * carries no data-source field: there is one server application database
 * backend — Turso/libSQL — in every runtime that may reach one, so the only
 * question left is whether *this* runtime may reach a database, never which.
 */
export interface DatabaseRuntimeContext {
  isNative: boolean;
  platform: string;
  isStatic: boolean;
  supportsServerApi: boolean;
}

/**
 * Throws when the caller is a runtime that must never open a server database.
 *
 * Browser, native and static execution reach data through the Business APIs;
 * a database client in any of them would mean shipping credentials to a client.
 */
export function assertServerDatabaseRuntime(
  runtime: DatabaseRuntimeContext,
  browserRuntime: boolean,
): void {
  if (browserRuntime) {
    throw new Error("Server database access is unavailable in browser runtimes.");
  }
  if (runtime.isNative || runtime.platform !== "web") {
    throw new Error(`Server database access is unavailable on ${runtime.platform}.`);
  }
  if (runtime.isStatic || !runtime.supportsServerApi) {
    throw new Error("Server database access is unavailable during static export.");
  }
}
