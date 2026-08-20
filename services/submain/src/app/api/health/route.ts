import { credentialHealthResponse } from '@asol/service-runtime-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return credentialHealthResponse({
    service: 'asol-submain',
    credentials: {
      productDatabase: process.env.TURSO_PRODUCT_DATABASE_URL,
      ordersCore: process.env.ORDERS_CORE_DATABASE_URL,
    },
  });
}
