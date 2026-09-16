import { POST as recordAdminSmsStatus } from '@/app/api/verification/admin-sms/status/route';
import { preflight, withCors } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await recordAdminSmsStatus(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
