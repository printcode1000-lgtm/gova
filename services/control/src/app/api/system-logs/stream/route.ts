import { controlError, controlPreflight } from '@/control/operational-route';
import { assertControlSystemLogAccess, createSseStream } from '@/control/system-logs';
export async function GET(request: Request): Promise<Response> {
  try {
    assertControlSystemLogAccess(request);
    return new Response(createSseStream(new URL(request.url).searchParams.get('since') ?? new Date(0).toISOString(), request.signal), { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } });
  } catch (error) {
    // The shared application mapping, not a two-branch guess. The guess made
    // `sessionTokenInvalid` a 500 — a rejected request reported as a server
    // fault, which is both wrong for the client and invisible to a gate that
    // watches for 5xx. `controlError` answers exactly what the application
    // answers for the same failure.
    return controlError(error);
  }
}
export function OPTIONS(request: Request): Response {
  return controlPreflight(request);
}
