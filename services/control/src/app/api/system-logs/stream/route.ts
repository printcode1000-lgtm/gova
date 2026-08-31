import { assertControlSystemLogAccess, createSseStream } from '@/control/system-logs';
export async function GET(request: Request): Promise<Response> {
  try {
    assertControlSystemLogAccess(request);
    return new Response(createSseStream(new URL(request.url).searchParams.get('since') ?? new Date(0).toISOString(), request.signal), { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } });
  } catch (error) { const message = error instanceof Error ? error.message : 'forbidden'; return new Response(message, { status: message === 'forbidden' ? 403 : 500 }); }
}
export async function OPTIONS() { return new Response(null, { status: 204 }); }
