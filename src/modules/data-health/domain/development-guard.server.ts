import "server-only";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import {
  assertLocalDevelopmentAllowed,
  readLocalDevelopmentRuntimeFromProcess,
} from "@asol/dev-core/server";

export function assertDataHealthAllowed(): void {
  assertLocalDevelopmentAllowed(
    readLocalDevelopmentRuntimeFromProcess(getServerRuntimeContext()),
    "dataHealthDevelopmentOnly",
  );
}
