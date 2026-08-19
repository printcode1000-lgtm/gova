import { POST as quoteDiscounts } from '@/app/api/profile/discounts/quote/route';
import { preflight, withCors } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await quoteDiscounts(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
