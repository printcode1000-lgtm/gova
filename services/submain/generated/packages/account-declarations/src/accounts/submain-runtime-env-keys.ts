import {
  GOVA_RUNTIME_OPTIONAL_ENV_KEYS,
  GOVA_RUNTIME_REQUIRED_ENV_KEYS,
} from './gova-runtime-env-keys';

/**
 * Runtime environment keys for the submain workload service.
 *
 * Search, cart checkout, and order creation span product, profile, order, and
 * users databases. The key set matches the primary application runtime minus
 * provisioning-only Vercel deploy tokens.
 */

export const SUBMAIN_RUNTIME_REQUIRED_ENV_KEYS = [
  ...GOVA_RUNTIME_REQUIRED_ENV_KEYS,
] as const;

export const SUBMAIN_RUNTIME_OPTIONAL_ENV_KEYS = [
  ...GOVA_RUNTIME_OPTIONAL_ENV_KEYS,
  'NEXT_PUBLIC_ASOL_SUBMAIN_URL',
] as const;
