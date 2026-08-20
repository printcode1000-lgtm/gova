import { shardHealthResponse } from '@asol/service-runtime-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The seven shards this deployment queries. Presence only — see `@asol/service-runtime-core`. */
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
  return shardHealthResponse({ service: 'asol-profiles', shardPrefixes: SHARD_PREFIXES });
}
