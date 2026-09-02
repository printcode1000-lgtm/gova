import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { StartProfileConversationInput } from '@/features/specialty-chat/domain/types';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const { messaging } = createSubmainRuntime();
    assertSubmainEnv();

    const result = await messaging.specialtyChat.startProfileConversation((await request.json()) as StartProfileConversationInput);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
