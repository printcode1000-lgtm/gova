import { POST as uploadImage } from '@/app/api/storage/images/upload/route';
import { preflight, withCors } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await uploadImage(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
