import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read the account-wide push mute switch.
 *
 * On this account because the switch is resolved against the users repository
 * before the preference is read — a capability `asol-notifications` must never
 * hold. This account holds the users database and the notifications database,
 * which is what the check needs. The identity contract is the same uid/phone
 * pair the application answered, so no client moves with the origin.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { devices } = createSubmainRuntime();
    assertSubmainEnv();

    const query = new URL(request.url).searchParams;
    const preference = await devices.getPushPreference(
      query.get('uid') ?? '',
      query.get('phone') ?? '',
    );
    return jsonResponse(request, preference, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

/** Flip the switch. Never touches a registration or a device token. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { devices } = createSubmainRuntime();
    assertSubmainEnv();

    const body = await readJsonBody<{
      uid: string;
      phone: string;
      pushEnabled: boolean;
    }>(request);
    // A mapped business code: an unmapped one falls through as a 500, which
    // would report a malformed request as a server fault.
    if (typeof body.pushEnabled !== 'boolean') {
      throw new Error('notificationPreferenceInvalid');
    }

    const preference = await devices.setPushPreference(
      body.uid,
      body.phone,
      body.pushEnabled,
    );
    return jsonResponse(request, preference, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
