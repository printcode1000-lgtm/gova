import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { UpdateProfileInput } from '@/features/auth/domain/profile.entity';
import { extractSessionToken } from '@asol/auth-core/server';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Update the signed-in user's profile. The session token may travel in a header or the body. */
export async function PUT(request: Request): Promise<Response> {
  try {
    const { auth } = createSubmainRuntime();
    assertSubmainEnv();

    const body = await readJsonBody<UpdateProfileInput>(request);
    const sessionToken = extractSessionToken(request, body);
    const profile = await auth.updateProfile({
      uid: body.uid,
      phone: body.phone,
      email: body.email,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      sessionToken,
    });
    return jsonResponse(request, profile, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
