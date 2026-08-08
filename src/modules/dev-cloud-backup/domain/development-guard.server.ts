import "server-only";
import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

function isDevCloudBackupRuntimeAllowed(): boolean {
  const runtime = getServerRuntimeContext();
  const publicMode = (process.env.NEXT_PUBLIC_ASOL_MODE ?? "")
    .trim()
    .toLowerCase();
  return (
    process.env.NODE_ENV === "development" &&
    runtime.isDevelopment &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    publicMode !== "static" &&
    !process.env.VERCEL
  );
}

export function assertDevCloudBackupAllowed(): void {
  if (!isDevCloudBackupRuntimeAllowed()) {
    throw new Error("devCloudBackupDevelopmentOnly");
  }
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
