import "server-only";

import {
  assertDevelopmentToolingAllowed,
  developmentToolingEnvironment,
} from "@/core/config/development-guard.server";

/**
 * Cloud backup writes to R2 with the project's own credentials and can restore over live data, so
 * it takes the **strict** gate: never on Vercel, never during a static export, never in the
 * production-build phase. The gate itself lives in `@/core/config/development-guard.server`; the
 * choice of `strict` is this module's, and it is the whole point of the file.
 */
export function assertDevCloudBackupAllowed(): void {
  assertDevelopmentToolingAllowed("devCloudBackupDevelopmentOnly", { strict: true });
}

export function devCloudBackupEnvironment() {
  return developmentToolingEnvironment({ strict: true });
}
