import { PUT as saveProfileEditor } from '@/app/api/profile/editor/route';
import { preflight, withCors } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request): Promise<Response> {
  return withCors(request, await saveProfileEditor(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
