export type AppDeployment =
  | "local-development"
  | "web-production"
  | "static-export";

export interface LocalDevelopmentRuntimeInput {
  isDevelopment: boolean;
  deployment: AppDeployment | string;
  nodeEnv?: string;
  publicMode?: string;
  vercel?: boolean;
  nextPhase?: string;
}

export interface LocalDevelopmentEnvironment {
  allowed: boolean;
  nodeEnv: "development" | "production";
  publicMode: string;
  vercel: boolean;
}

export function isLocalDevelopmentRuntime(
  input: LocalDevelopmentRuntimeInput,
): boolean {
  return input.isDevelopment === true;
}

/**
 * Stricter gate for tools that must never run on Vercel, during static export,
 * or while Next.js is in the production-build phase.
 */
export function isStrictLocalDevelopmentRuntime(
  input: LocalDevelopmentRuntimeInput,
): boolean {
  const publicMode = (input.publicMode ?? "").trim().toLowerCase();
  return (
    input.nodeEnv === "development" &&
    input.isDevelopment === true &&
    input.nextPhase !== "phase-production-build" &&
    publicMode !== "static" &&
    input.vercel !== true
  );
}

export function buildLocalDevelopmentEnvironment(
  input: LocalDevelopmentRuntimeInput,
): LocalDevelopmentEnvironment {
  return {
    allowed: isLocalDevelopmentRuntime(input),
    nodeEnv: input.isDevelopment ? "development" : "production",
    publicMode: input.deployment,
    vercel: input.deployment === "web-production",
  };
}

export function assertLocalDevelopmentAllowed(
  input: LocalDevelopmentRuntimeInput,
  errorCode: string,
): void {
  if (!isLocalDevelopmentRuntime(input)) {
    throw new Error(errorCode);
  }
}

export function assertStrictLocalDevelopmentAllowed(
  input: LocalDevelopmentRuntimeInput,
  errorCode: string,
): void {
  if (!isStrictLocalDevelopmentRuntime(input)) {
    throw new Error(errorCode);
  }
}
