export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness only. It reports whether each shard credential is *present*, never
 * its value, so the endpoint can stay public while still making a partially
 * configured deployment visible without issuing a query.
 */
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
  const missing = SHARD_PREFIXES.filter(
    (prefix) => !process.env[`${prefix}_DATABASE_URL`],
  );
  return Response.json({
    service: 'asol-orders',
    ok: missing.length === 0,
    configured: { shards: SHARD_PREFIXES.length - missing.length, missing },
  });
}
