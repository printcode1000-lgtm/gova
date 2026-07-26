import "server-only";

export function assertDevCloudBackupAllowed(): void {
  const isDev =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.NEXT_PUBLIC_ASOL_MODE !== "static" &&
    !process.env.VERCEL;

  if (!isDev) throw new Error("devCloudBackupDevelopmentOnly");
}

export function devCloudBackupEnvironment() {
  return {
    allowed:
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PHASE !== "phase-production-build" &&
      process.env.NEXT_PUBLIC_ASOL_MODE !== "static" &&
      !process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV ?? "",
    publicMode: process.env.NEXT_PUBLIC_ASOL_MODE ?? "",
    vercel: Boolean(process.env.VERCEL),
  };
}
