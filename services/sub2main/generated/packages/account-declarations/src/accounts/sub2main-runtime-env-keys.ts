import { REQUIRED_ENV_KEYS as PRODUCT_REQUIRED_ENV_KEYS, OPTIONAL_ENV_KEYS as PRODUCT_OPTIONAL_ENV_KEYS } from './products';
import { PROFILES_DECLARATION } from './profiles';

/**
 * Runtime environment keys for the sub2main seller workload service.
 *
 * Product writes, profile management, and image uploads span the product
 * Turso database, all profile shards, users/auth, and R2 storage.
 */

export const SUB2MAIN_RUNTIME_REQUIRED_ENV_KEYS = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  ...PRODUCT_REQUIRED_ENV_KEYS,
  ...PROFILES_DECLARATION.requiredEnv,
] as const;

export const SUB2MAIN_RUNTIME_OPTIONAL_ENV_KEYS = [
  ...PRODUCT_OPTIONAL_ENV_KEYS,
  ...PROFILES_DECLARATION.optionalEnv,
  'NEXT_PUBLIC_ASOL_SUB2MAIN_URL',
] as const;
