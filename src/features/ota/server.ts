import "server-only";

import { configureOtaCore } from "@asol/ota-core";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";

/**
 * The server half of the `@asol/ota-core` port registration.
 *
 * Kept apart from `ota-core-ports.ts` because `persistent-system-log-service.server`
 * reads the database directly: importing it from the browser half would pull the users
 * repository into the client bundle, which is exactly the kind of reach the seal exists
 * to prevent.
 *
 * `configureOtaCore` merges, so registering here does not clear the browser half.
 */
export function registerOtaCoreServerPorts(): void {
  configureOtaCore({
    telemetry: {
      ingestBatch: async () => undefined,
      reportFailure: () => {
        /* server-side failures go through the log service directly */
      },
      list: (input) => persistentSystemLogService.list(input),
    },
    identity: { isSuperAdmin: isSuperAdminIdentity },
  });
}
