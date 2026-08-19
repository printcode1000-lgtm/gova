import { PUT as saveFulfillmentSettings } from '@/app/api/profile/fulfillment-settings/route';
import { preflight, withCors } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request): Promise<Response> {
  return withCors(request, await saveFulfillmentSettings(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
