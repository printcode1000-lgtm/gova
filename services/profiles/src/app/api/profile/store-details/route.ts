import { assertProfilesEnv, createProfilesRuntime } from '@asol/profiles-composition';
import { corsHeaders, preflight, profileErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Store details. Writes stay on the main app. */
export async function GET(request: Request): Promise<Response> {
  try {
    // Layer 2. The composition is the only thing that knows which capabilities this
    // account owns. Built per request, never at module scope: module scope runs during
    // `next build`, where no account credential exists.
    const { profiles } = createProfilesRuntime();
    assertProfilesEnv();

    const { searchParams } = new URL(request.url);
    const data = await profiles.getStoreDetails(searchParams.get('uid') ?? '');
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return profileErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
