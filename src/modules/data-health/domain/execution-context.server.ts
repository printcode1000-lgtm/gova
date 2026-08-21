import "server-only";

import { resolveDataHealthExecutionContext as resolveContext } from "@asol/data-health-core";
import { isDevRuntime } from "@/core/config/runtime-context.server";

/** Application adapter: supplies the runtime fact to the dependency-free domain policy. */
export function resolveDataHealthExecutionContext() {
  return resolveContext(isDevRuntime());
}
