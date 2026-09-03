import { loadReleaseToolEnvironment } from "@asol/env-core/process";

/**
 * Build a server-service environment from the release-tool sources while
 * explicitly clearing static-export mode. The caller environment is not mutated.
 */
export function createServiceReleaseEnvironment(
  cwd: string,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...baseEnv };
  loadReleaseToolEnvironment({ cwd, env });
  delete env.ASOL_MODE;
  delete env.NEXT_PUBLIC_ASOL_MODE;
  return env;
}
