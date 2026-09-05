import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { SendSpecialtyReceiptInput } from '@/features/specialty-chat/domain/types';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const { messaging } = createSubmainRuntime();
    assertSubmainEnv();

    const result = await messaging.specialtyChat.sendReceipt(await readJsonBody<SendSpecialtyReceiptInput>(request));
    return jsonResponse(request, result, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
