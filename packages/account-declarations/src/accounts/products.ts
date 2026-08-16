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
] as const;

export const PRODUCTS_DECLARATION = {
  name: 'products',
  project: 'asol-products',
  tokenEnvVar: 'VERCEL_PRODUCTS_TOKEN',
  serviceDir: 'services/products',
  requiredEnv: REQUIRED_ENV_KEYS,
  optionalEnv: OPTIONAL_ENV_KEYS,
  mirrorEntryPoints: [
    'features/product/services/product-service.server.ts',
    'features/product/services/product-review-service.server.ts',
    'features/product-search/services/product-search-products.server.ts',
    'features/product-search/services/product-search-fields.server.ts',
    'features/categories/index.ts',
    'core/config/server-env.ts',
  ],
  runtimeAssets: ['src/config/storage-profiles.json'],
} as const;
