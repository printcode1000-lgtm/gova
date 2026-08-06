/**
 * Minimal HTTP helpers for the orders service.
 *
 * The main app's `apiSuccess` / `mapOrderError` are deliberately not reused:
 * they reach into request tracing and system logging, which would pull a large
 * part of the application's module graph into a deployment that only reads
 * orders.
 *
 * The status mapping below mirrors `mapOrderError` in
 * `src/app/api/orders/order-api-helpers.ts` so a client cannot tell which
 * deployment answered. Only the branches a read path can reach are kept —
 * conflict codes belong to writes, which never run here.
 */

export function corsHeaders(request: Request): Record<string, string> {
  // The browser is the only caller and these endpoints are read-only. No
  // credentials are accepted — the bridge sends `credentials: "omit"` — so a
  // permissive origin cannot be used to ride on someone's session.
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function orderErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status =
    message === 'userNotFound'
      ? 401
      : message === 'Forbidden' || message.includes('only')
        ? 403
        : message.includes('not found') || message.includes('notFound')
          ? 404
          : message.includes('required') ||
              message.includes('invalid') ||
              message.includes('must') ||
              message.includes('does not')
            ? 400
            : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}
