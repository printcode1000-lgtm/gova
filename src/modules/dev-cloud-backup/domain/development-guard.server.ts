import "server-only";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import {
  assertStrictLocalDevelopmentAllowed,
  buildLocalDevelopmentEnvironment,
  isStrictLocalDevelopmentRuntime,
  readLocalDevelopmentRuntimeFromProcess,
} from "@asol/dev-core/server";

function readRuntimeInput() {
  return readLocalDevelopmentRuntimeFromProcess(getServerRuntimeContext());
}

function isDevCloudBackupRuntimeAllowed(): boolean {
  return isStrictLocalDevelopmentRuntime(readRuntimeInput());
}

export function assertDevCloudBackupAllowed(): void {
  assertStrictLocalDevelopmentAllowed(
    readRuntimeInput(),
    "devCloudBackupDevelopmentOnly",
  );
}

export function devCloudBackupEnvironment() {
  const runtime = getServerRuntimeContext();
  return {
    allowed: isDevCloudBackupRuntimeAllowed(),
    nodeEnv: process.env.NODE_ENV === "development" ? "development" : "production",
    publicMode: runtime.deployment,
    vercel: runtime.deployment === "web-production",
  };
}
