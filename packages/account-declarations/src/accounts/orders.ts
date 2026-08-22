export const REQUIRED_ENV_KEYS = [
  'ORDERS_CORE_DATABASE_URL',
  'ORDERS_CORE_DATABASE_AUTH_TOKEN',
] as const;

export const OPTIONAL_ENV_KEYS = [
  'ORDERS_ITEMS_DATABASE_URL',
  'ORDERS_ITEMS_DATABASE_AUTH_TOKEN',
  'ORDERS_FULFILLMENT_DATABASE_URL',
  'ORDERS_FULFILLMENT_DATABASE_AUTH_TOKEN',
  'ORDERS_DELIVERY_PLANS_DATABASE_URL',
  'ORDERS_DELIVERY_PLANS_DATABASE_AUTH_TOKEN',
  'ORDERS_SHIPPING_QUOTES_DATABASE_URL',
  'ORDERS_SHIPPING_QUOTES_DATABASE_AUTH_TOKEN',
  'ORDERS_PAYMENTS_DATABASE_URL',
  'ORDERS_PAYMENTS_DATABASE_AUTH_TOKEN',
  'ORDERS_REFUNDS_DATABASE_URL',
  'ORDERS_REFUNDS_DATABASE_AUTH_TOKEN',
  'ORDERS_AFTER_SALES_DATABASE_URL',
  'ORDERS_AFTER_SALES_DATABASE_AUTH_TOKEN',
  'ORDERS_DISPUTES_AUDIT_DATABASE_URL',
  'ORDERS_DISPUTES_AUDIT_DATABASE_AUTH_TOKEN',
] as const;

export const ORDERS_DECLARATION = {
  name: 'orders',
  project: 'asol-orders',
  email: 'tenderx10@gmail.com',
  tokenEnvVar: 'VERCEL_ORDERS_TOKEN',
  serviceDir: 'services/orders',
  requiredEnv: [
    ...REQUIRED_ENV_KEYS,
    ...OPTIONAL_ENV_KEYS,
  ],
  optionalEnv: [],
  // The order reads themselves are no longer listed here. They live behind
  // `@asol/data-core/marketplace-orders`, which `@asol/orders-composition` imports, so the
  // mirror walker reaches them through the package graph. Naming a package file as a mirror
  // entry point would mean naming an internal path, which is exactly what the seal forbids.
  // Only application files are listed here. The order reads and the order vocabulary both live
  // in packages now — `@asol/data-core/marketplace-orders` and `@asol/orders-core` — and
  // `@asol/orders-composition` imports both, so the mirror walker reaches them through the
  // package graph. Naming a file inside a sealed package as a mirror entry point would mean
  // naming an internal path, which is exactly what the seal forbids.
  mirrorEntryPoints: [
    'core/config/server-env.ts',
  ],
  runtimeAssets: [],
} as const;
