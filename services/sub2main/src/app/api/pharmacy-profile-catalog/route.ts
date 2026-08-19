import { POST as mutateCatalog } from '@/app/api/pharmacy-profile-catalog/route';
import { preflight, withCors } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await mutateCatalog(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
