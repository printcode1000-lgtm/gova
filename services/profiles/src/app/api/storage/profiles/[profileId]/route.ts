import { assertProfilesEnv, createProfilesRuntime } from '@asol/profiles-composition';

import { corsHeaders, preflight, profileErrorResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Per-profile storage limits. A read: this account cannot mutate the bucket. */
export async function GET(
  request: Request,
  context: { params: Promise<{ profileId: string }> },
): Promise<Response> {
  try {
    const { images } = createProfilesRuntime();
    assertProfilesEnv();

    const { profileId } = await context.params;
    const limits = images.getProfile(profileId);
    return Response.json(limits, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return profileErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
