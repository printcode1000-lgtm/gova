import "server-only";

import { assertDevelopmentToolingAllowed } from "@/core/config/development-guard.server";

/**
 * Data health reads and purges rows, so it never runs outside a development build. The runtime
 * question itself is answered once in `@/core/config/development-guard.server`; what belongs here
 * is only this module's error code.
 */
export function assertDataHealthAllowed(): void {
  assertDevelopmentToolingAllowed("dataHealthDevelopmentOnly");
}
