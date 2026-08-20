/**
 * @asol/env-core — how an environment variable is read, not which ones exist.
 *
 * Key ownership stays where it belongs: `@asol/account-declarations` for deployment keys, each
 * capability package for its own credentials. This package holds only the reading rules, so that
 * "unset", "blank" and "present" mean one thing across the application, the packages and the
 * provisioning scripts.
 */
export type { EnvSource } from './domain/read-env';
export {
  firstEnv,
  hasEnv,
  readBooleanEnv,
  readEnv,
  readListEnv,
  readOptionalEnv,
  requireEnv,
} from './domain/read-env';
