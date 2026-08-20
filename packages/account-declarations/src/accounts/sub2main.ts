import {
  SUB2MAIN_RUNTIME_OPTIONAL_ENV_KEYS,
  SUB2MAIN_RUNTIME_REQUIRED_ENV_KEYS,
} from './sub2main-runtime-env-keys';

/**
 * Seller profile, product writes, and storage uploads on an isolated Vercel account.
 *
 * Vercel account email: tenderx.engineer100@gmail.com
 *
 * Deployed from `services/sub2main/` via CLI (never GitHub-linked). The browser
 * bridge routes matching write APIs here; deployments never call each other.
 */
export const SUB2MAIN_DECLARATION = {
  name: 'sub2main',
  project: 'asol-sub2main',
  tokenEnvVar: 'VERCEL_SUB2MAIN_TOKEN',
  teamIdEnvVar: 'VERCEL_SUB2MAIN_ORG_ID',
  serviceDir: 'services/sub2main',
  deployFromRepositoryRoot: undefined,
  requiredEnv: SUB2MAIN_RUNTIME_REQUIRED_ENV_KEYS,
  optionalEnv: SUB2MAIN_RUNTIME_OPTIONAL_ENV_KEYS,
  // Nothing is copied in beside the walked module graph: the storage profile file now travels
  // with `@asol/storage-core`, which imports it.
  runtimeAssets: [],
  mirrorEntryPoints: [
    'features/product/services/product-service.server.ts',
    'features/profile/services/profile-service.bootstrap.server.ts',
    'features/storage/services/image-storage-service.bootstrap.server.ts',
    'features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server.ts',
    'app/api/products/route.ts',
    'app/api/profile/editor/route.ts',
    'app/api/profile/contacts/route.ts',
    'app/api/profile/store-details/route.ts',
    'app/api/profile/store-images/route.ts',
    'app/api/profile/specialties/route.ts',
    'app/api/profile/fulfillment-settings/route.ts',
    'app/api/profile/discounts/route.ts',
    'app/api/profile/discounts/quote/route.ts',
    'app/api/storage/images/upload/route.ts',
    'app/api/pharmacy-profile-catalog/route.ts',
    'core/config/server-env.ts',
    'features/categories/index.ts',
  ],
} as const;
