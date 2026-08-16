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
  tokenEnvVar: 'VERCEL_ORDERS_TOKEN',
  serviceDir: 'services/orders',
  requiredEnv: [
    ...REQUIRED_ENV_KEYS,
    ...OPTIONAL_ENV_KEYS,
  ],
  optionalEnv: [],
  mirrorEntryPoints: [
    'modules/data-access/domains/marketplace-orders/index.server.ts',
    'modules/marketplace-orders/domain/actor-from-input.ts',
    'core/config/server-env.ts',
  ],
  runtimeAssets: [],
} as const;
