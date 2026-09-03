import { parseAllowedOrigins } from './origins';

/**
 * The one environment variable that configures allowed origins, and the one place its name is
 * spelled.
 *
 * Four modules used to read it independently — the application's configuration layer, the R2
 * bucket policy, the OTA bucket policy, and a second copy in the server-environment values — each
 * with its own fallback when the variable was unset: `[]`, `['*']`, `['*']`, and a list of
 * development origins. Those fallbacks are genuinely different decisions, so the fallback stayed a
 * caller's choice; the *parsing* and the variable's name did not.
 */
export const CORS_ORIGINS_ENV_KEY = 'ASOL_CORS_ORIGINS';

/** The slice of an environment this package reads. */
export interface CorsEnvironment {
  readonly [key: string]: string | undefined;
}

/**
 * Reads `ASOL_CORS_ORIGINS` and returns the configured origins.
 *
 * `fallback` is what an *unset or empty* variable means for this caller, and it must be stated:
 * the main application's API boundary allows nothing (an unconfigured deployment refuses rather
 * than opens), while a bucket policy allows any origin because the bytes it serves are public.
 * Defaulting silently to one of those would make the other wrong.
 */
export function corsOriginsFromEnv(
  env: CorsEnvironment,
  fallback: readonly string[] = [],
): string[] {
  const configured = parseAllowedOrigins(env[CORS_ORIGINS_ENV_KEY]);
  return configured.length > 0 ? configured : [...fallback];
}
