import { POST as createCustomRequest } from '@/app/api/orders/custom-request-from-profile/route';
import { preflight, withCors } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await createCustomRequest(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
