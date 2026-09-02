import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { UpdateProfileInput } from '@/features/auth/domain/profile.entity';
import { extractSessionToken } from '@asol/auth-core/server';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Update the signed-in user's profile. The session token may travel in a header or the body. */
export async function PUT(request: Request): Promise<Response> {
  try {
    const { auth } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as UpdateProfileInput;
    const sessionToken = extractSessionToken(request, body);
    const profile = await auth.updateProfile({ ...body, sessionToken });
    return Response.json(profile, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
