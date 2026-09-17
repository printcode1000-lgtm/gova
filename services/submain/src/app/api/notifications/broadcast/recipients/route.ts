import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { businessErrorResponse, preflight, jsonResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { devices } = createSubmainRuntime();
    assertSubmainEnv();
    const claims = devices.assertSuperAdmin(request);
    const result = await devices.listBroadcastRecipients({ uid: claims.uid, phone: claims.phone });
    return jsonResponse(request, result, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response { return preflight(request); }
