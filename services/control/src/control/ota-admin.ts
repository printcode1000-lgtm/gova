import 'server-only';

import { configureOtaCore, otaReleaseService } from '@asol/ota-core/admin';
import { createControlOtaReleaseRepository } from '@asol/data-core/control-ota';
import { persistentSystemLogService } from '@/features/system-logs/server/services/persistent-system-log-service.server';
import { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } from '@asol/auth-core';
import { isSuperAdminIdentity, registerSuperAdminIdentity } from '@asol/auth-core/super-admin';
import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

registerSuperAdminIdentity(() => ({ uid: SUPER_ADMIN_UID, phone: SUPER_ADMIN_PHONE }));
configureOtaCore({
  telemetry: { ingestBatch: async () => undefined, reportFailure: () => undefined, list: async ({ limit }) => (await persistentSystemLogService.list({ limit })).items.map((entry) => ({ feature: entry.feature, operation: entry.operation, message: entry.message, occurrences: entry.occurrences })) },
  identity: { isSuperAdmin: isSuperAdminIdentity },
  releaseRepository: createControlOtaReleaseRepository(),
});
export { otaReleaseService };

/** Same status and body the application answered for the same OTA failure. */
export function otaError(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const mapped = businessApiErrorStatus(message);
  return Response.json({ error: mapped.code }, { status: mapped.status });
}
