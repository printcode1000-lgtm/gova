import { POST as redeemAdminSms } from '@/app/api/verification/admin-sms/redeem/route';
import { preflight, withCors } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await redeemAdminSms(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
