import { registerDataCoreRuntimeConfigPorts } from '@/features/data/ports/data-core-runtime-config-ports';

/**
 * Control-only composition seam. Business workload ports must not register here.
 *
 * Control is an operational runtime, not a workload, but it needs the one port
 * every isolated deployment needs and none inherits: `@asol/data-core`'s
 * runtime-config port. `forceRemoteDataSource` because control is Turso-only
 * and ships no SQLite driver.
 *
 * Why this function being empty broke every data-touching control route while
 * health stayed 200 and the deployment reported READY:
 * `docs/08-troubleshooting/problems/every-server-route-500-unregistered-port.md`.
 *
 * Ports with a natural home register there instead: System Logs in
 * `control/system-logs.ts`, OTA administration in `control/ota-admin.ts`,
 * storage transport in the mirrored `features/storage/ports`.
 */
export async function registerControlServerPorts(): Promise<void> {
  registerDataCoreRuntimeConfigPorts({ forceRemoteDataSource: true });
}
