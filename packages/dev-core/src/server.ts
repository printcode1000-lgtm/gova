import type { LocalDevelopmentRuntimeInput } from "./guards/development-guard";

/**
 * The server-side half of the Development guard: reading the process
 * environment, which the pure rules in `guards/` must not do themselves.
 *
 * It resolves no paths. Path resolution lived here when `public/sync_data` held
 * application databases and uploaded images; both are gone, and a
 * Development-guard package that still knew where a database file lived would
 * be an invitation to put one back.
 */
export function readLocalDevelopmentRuntimeFromProcess(
  runtime: Pick<LocalDevelopmentRuntimeInput, "isDevelopment" | "deployment">,
  env: NodeJS.ProcessEnv = process.env,
): LocalDevelopmentRuntimeInput {
  return {
    isDevelopment: runtime.isDevelopment,
    deployment: runtime.deployment,
    nodeEnv: env.NODE_ENV,
    publicMode: env.NEXT_PUBLIC_ASOL_MODE,
    vercel: env.VERCEL === "1" || Boolean(env.VERCEL_ENV),
    nextPhase: env.NEXT_PHASE,
  };
}

export {
  assertLocalDevelopmentAllowed,
  assertStrictLocalDevelopmentAllowed,
  buildLocalDevelopmentEnvironment,
  isLocalDevelopmentRuntime,
  isStrictLocalDevelopmentRuntime,
  type AppDeployment,
  type LocalDevelopmentEnvironment,
  type LocalDevelopmentRuntimeInput,
} from "./guards/development-guard";
