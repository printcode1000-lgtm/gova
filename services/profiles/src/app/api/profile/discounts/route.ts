import { assertProfilesEnv, createProfilesRuntime } from '@asol/profiles-composition';

import { corsHeaders, preflight, profileErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A seller's discounts, read from the `profile-promotions` shard.
 *
 * `includeInactive` defaults to true and is disabled only by an explicit `0`,
 * exactly as the application reads it — a different default here would silently
 * change what a seller sees.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { database } = createProfilesRuntime();
    assertProfilesEnv();

    const { searchParams } = new URL(request.url);
    const sellerUid = searchParams.get('sellerUid') ?? '';
    const includeInactive = searchParams.get('includeInactive') !== '0';
    const discounts = await database.sellerDiscounts.listSellerDiscounts(sellerUid, includeInactive);
    return Response.json(discounts, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return profileErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
