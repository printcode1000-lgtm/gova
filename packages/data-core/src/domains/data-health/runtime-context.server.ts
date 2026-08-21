import "server-only";

import { resolveDataHealthExecutionContext as resolveContext } from "@asol/data-health-core";
import { isDevRuntime } from "../../core/database/environment";

/** Data adapter: derives the same context without reaching back into application code. */
export function resolveDataHealthExecutionContext() {
  return resolveContext(isDevRuntime());
}
