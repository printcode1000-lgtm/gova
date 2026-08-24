import {
  SUBMAIN_RUNTIME_OPTIONAL_ENV_KEYS,
  SUBMAIN_RUNTIME_REQUIRED_ENV_KEYS,
} from './submain-runtime-env-keys';

/**
 * Search, cart checkout, and order-creation workload on an isolated Vercel account.
 *
 * Vercel account email: groupstenderximages@gmail.com
 *
 * Deployed from `services/submain/` via CLI (never GitHub-linked). The browser
 * bridge routes matching API calls here; deployments never call each other.
 */
export const SUBMAIN_DECLARATION = {
  name: 'submain',
  project: 'asol-submain',
  email: 'groupstenderximages@gmail.com',
  tokenEnvVar: 'VERCEL_SUBMAIN_TOKEN',
  teamIdEnvVar: 'VERCEL_SUBMAIN_ORG_ID',
  serviceDir: 'services/submain',
  deployFromRepositoryRoot: undefined,
  requiredEnv: SUBMAIN_RUNTIME_REQUIRED_ENV_KEYS,
  optionalEnv: SUBMAIN_RUNTIME_OPTIONAL_ENV_KEYS,
  // Nothing is copied in beside the walked module graph: the storage profile file now travels
  // with `@asol/storage-core`, which imports it.
  runtimeAssets: [],
  mirrorEntryPoints: [
    'features/product-search/server/services/product-search-service.server.ts',
    'features/product-search/server/services/product-search-products.server.ts',
    'features/product-search/server/services/product-search-fields.server.ts',
    'features/cart/server/services/cart-catalogue-pricing.server.ts',
    'app/api/orders/from-cart/route.ts',
    'app/api/orders/custom-request-from-profile/route.ts',
    'core/config/server-env.ts',
    'features/categories/index.ts',
  ],
} as const;
