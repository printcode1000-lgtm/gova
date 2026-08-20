import { shardHealthResponse } from '@asol/service-runtime-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The nine shards this deployment queries. Presence only — see `@asol/service-runtime-core`. */
const SHARD_PREFIXES = [
  'ORDERS_CORE',
  'ORDERS_ITEMS',
  'ORDERS_FULFILLMENT',
  'ORDERS_DELIVERY_PLANS',
  'ORDERS_SHIPPING_QUOTES',
  'ORDERS_PAYMENTS',
  'ORDERS_REFUNDS',
  'ORDERS_AFTER_SALES',
  'ORDERS_DISPUTES_AUDIT',
] as const;

export function GET(): Response {
  return shardHealthResponse({ service: 'asol-orders', shardPrefixes: SHARD_PREFIXES });
}
