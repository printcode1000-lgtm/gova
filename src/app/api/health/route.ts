import { apiSuccess } from '@/core/api/api-response';

export function GET() {
  return apiSuccess({ status: 'ok' as const });
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
