import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { DeleteAccountInput } from '@asol/auth-core';
import { extractSessionToken } from '@asol/auth-core/server';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Account deletion spans several shards and stays with one owner.
 *
 * The alternative — a chain of backend-to-backend calls — is what the
 * architecture forbids: this account holds every credential the deletion needs.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { account } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as DeleteAccountInput;
    const sessionToken = extractSessionToken(request, body);
    const result = await account.delete({ ...body, sessionToken });
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
