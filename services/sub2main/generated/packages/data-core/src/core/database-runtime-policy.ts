/**
 * Minimal runtime shape needed to pick a server DB backend.
 * Mirrors the fields of app `AppRuntimeContext` without importing `@/`.
 */
export interface DatabaseRuntimeContext {
  isNative: boolean;
  platform: string;
  isStatic: boolean;
  supportsServerApi: boolean;
  dataSource: string;
}

export type ServerDatabaseBackend = "sqlite" | "turso";

export function resolveServerDatabaseBackend(
  runtime: DatabaseRuntimeContext,
  browserRuntime: boolean,
): ServerDatabaseBackend {
  if (browserRuntime) {
    throw new Error("Server database access is unavailable in browser runtimes.");
  }
  if (runtime.isNative || runtime.platform !== "web") {
    throw new Error(`Server database access is unavailable on ${runtime.platform}.`);
  }
  if (runtime.isStatic || !runtime.supportsServerApi) {
    throw new Error("Server database access is unavailable during static export.");
  }
  return runtime.dataSource === "local" ? "sqlite" : "turso";
}
