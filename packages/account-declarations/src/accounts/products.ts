export const REQUIRED_ENV_KEYS = [
  'TURSO_PRODUCT_DATABASE_URL',
  'TURSO_PRODUCT_AUTH_TOKEN',
] as const;

export const OPTIONAL_ENV_KEYS = [
  'PRODUCT_R2_ACCOUNT_ID',
  'PRODUCT_R2_ACCESS_KEY_ID',
  'PRODUCT_R2_SECRET_ACCESS_KEY',
  'PRODUCT_R2_BUCKET_NAME',
  'PRODUCT_R2_ENDPOINT',
  'PRODUCT_R2_PUBLIC_URL',
  'APPAREL_PETS_R2_ACCOUNT_ID',
  'APPAREL_PETS_R2_ACCESS_KEY_ID',
  'APPAREL_PETS_R2_SECRET_ACCESS_KEY',
  'APPAREL_PETS_R2_BUCKET_NAME',
  'APPAREL_PETS_R2_PUBLIC_URL',
] as const;

export const PRODUCTS_DECLARATION = {
  name: 'products',
  project: 'asol-products',
  tokenEnvVar: 'VERCEL_PRODUCTS_TOKEN',
  serviceDir: 'services/products',
  requiredEnv: REQUIRED_ENV_KEYS,
  optionalEnv: OPTIONAL_ENV_KEYS,
  // Nothing is copied in beside the walked module graph: the storage profile file now travels
  // with `@asol/storage-core`, which imports it.
  runtimeAssets: [],
  mirrorEntryPoints: [
    'features/product/services/product-service.server.ts',
    'features/product/services/product-review-service.server.ts',
    'features/categories/index.ts',
    'core/config/server-env.ts',
  ],
} as const;
