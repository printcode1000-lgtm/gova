import { assertProfilesEnv, createProfilesRuntime } from '@asol/profiles-composition';

import { corsHeaders, preflight, profileErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Store images for a seller profile. Writes stay with the write account. */
export async function GET(request: Request): Promise<Response> {
  try {
    const { database } = createProfilesRuntime();
    assertProfilesEnv();

    const uid = new URL(request.url).searchParams.get('uid') ?? '';
    const images = await database.profiles.getStoreImages(uid);
    return Response.json(images, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return profileErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
