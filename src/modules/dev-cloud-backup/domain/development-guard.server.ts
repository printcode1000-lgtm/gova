import "server-only";
import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

export function assertDevCloudBackupAllowed(): void {
  const runtime = getServerRuntimeContext();
  const isDev = runtime.isDevelopment && process.env.NEXT_PHASE !== "phase-production-build";

  if (!isDev) throw new Error("devCloudBackupDevelopmentOnly");
}

export function devCloudBackupEnvironment() {
  const runtime = getServerRuntimeContext();
  return {
    allowed:
      runtime.isDevelopment && process.env.NEXT_PHASE !== "phase-production-build",
    nodeEnv: runtime.isDevelopment ? "development" : "production",
    publicMode: runtime.deployment,
    vercel: runtime.deployment === "web-production",
  };
}
