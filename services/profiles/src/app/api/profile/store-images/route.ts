import { assertProfilesEnv, createProfilesRuntime } from '@asol/profiles-composition';

import { corsHeaders, preflight, profileErrorResponse, jsonResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Store images for a seller profile. Writes stay with the write account. */
export async function GET(request: Request): Promise<Response> {
  try {
    const { database } = createProfilesRuntime();
    assertProfilesEnv();

    const uid = new URL(request.url).searchParams.get('uid') ?? '';
    const images = await database.profiles.getStoreImages(uid);
    return jsonResponse(request, images, 200);
  } catch (error) {
    return profileErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
