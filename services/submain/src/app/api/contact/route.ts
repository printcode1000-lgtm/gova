import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { ContactMessageInput } from '@/features/contact/application/types';

import { businessErrorResponse, corsHeaders, preflight } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Contact messages. The caller's IP is what the rate limiter counts. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { messaging } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as ContactMessageInput;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const result = await messaging.contact.send(body, ip);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
