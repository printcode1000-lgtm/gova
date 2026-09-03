import { corsOriginsFromEnv } from '@asol/cors';

/**
 * The origins the main application's API boundary allows, read from the environment.
 *
 * The Configuration layer owns environment reads, so the variable is read here; the parsing and
 * the variable's name belong to `@asol/cors`, which every other CORS surface in the repository
 * also reads them through. An unset variable allows nothing: an unconfigured deployment refuses
 * cross-origin reads rather than opening them.
 */
export function getCorsOrigins(): string[] {
  return corsOriginsFromEnv(process.env);
}
