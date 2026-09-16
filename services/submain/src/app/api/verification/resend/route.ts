import { POST as resendVerification } from '@/app/api/verification/resend/route';
import { preflight, withCors } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await resendVerification(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
