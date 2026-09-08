import { getServerRuntimeContext } from '../../ports/runtime-config';
import { assertServerDatabaseRuntime } from "../database-runtime-policy";

/**
 * Whether *this* runtime may open a server database at all.
 *
 * There is nothing here that resolves a path or picks a backend: server
 * application data is Turso/libSQL in every runtime, so the only remaining
 * question is legality, and the answer is a throw or nothing.
 */
export function assertServerDataAccessRuntime(): void {
  assertServerDatabaseRuntime(
    getServerRuntimeContext(),
    typeof window !== "undefined",
  );
}

export function isStaticExportBuild(): boolean {
  return getServerRuntimeContext().isStatic;
}

export function isProvisioningContext(): boolean {
  return getServerRuntimeContext().isProvisioning;
}
