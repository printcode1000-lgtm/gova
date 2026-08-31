import 'server-only';
import { configureOtaCore } from '@asol/ota-core/admin';
import { isConfiguredSuperAdminIdentity } from '@/features/super-admin/server';
import { persistentSystemLogService } from '@/features/system-logs/server';
import { createMainOtaReleaseRepository } from '@asol/data-core/ota-runtime';

/** Registers only OTA-admin server dependencies; no browser/native OTA ports. */
export function registerOtaAdminServerPorts(): void {
  configureOtaCore({
    telemetry: {
      ingestBatch: async () => undefined,
      reportFailure: () => undefined,
      list: async ({ limit }) => (await persistentSystemLogService.list({ limit })).items.map((entry) => ({
        feature: entry.feature, operation: entry.operation, message: entry.message, occurrences: entry.occurrences,
      })),
    },
    identity: { isSuperAdmin: isConfiguredSuperAdminIdentity },
    releaseRepository: createMainOtaReleaseRepository(),
  });
}
