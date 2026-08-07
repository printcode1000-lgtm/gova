export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness only. Reports whether each shard credential is present, never its
 * value, so a partially configured deployment is visible without a query.
 */
const SHARD_PREFIXES = [
  'PROFILE_CORE',
  'PROFILE_CONTACT',
  'PROFILE_MEDIA',
  'PROFILE_SOCIAL',
  'PROFILE_CATALOG',
  'PROFILE_PROMOTIONS',
  'PROFILE_FULFILLMENT',
] as const;

export function GET(): Response {
  const missing = SHARD_PREFIXES.filter((p) => !process.env[`${p}_DATABASE_URL`]);
  return Response.json({
    service: 'asol-profiles',
    ok: missing.length === 0,
    configured: { shards: SHARD_PREFIXES.length - missing.length, missing },
  });
}
