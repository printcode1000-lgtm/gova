import type { AppRuntimeContext } from "@/core/config/runtime-context";

export type ServerDatabaseBackend = "sqlite" | "turso";

export function resolveServerDatabaseBackend(
  runtime: AppRuntimeContext,
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
