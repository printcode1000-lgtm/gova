/**
 * HTTP helpers for the submain service.
 *
 * Deliberately minimal: no system-logging graph. Error codes match the main app
 * so clients cannot tell which deployment answered.
 */

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Asol-Trace-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function searchErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status = message === 'invalidSearchCategory' ? 400 : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}

export function orderErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status =
    message === 'orderNotFound'
      ? 404
      : message === 'orderForbidden'
        ? 403
        : [
              'invalidOrder',
              'Cart items are required',
              'Buyer phone is required',
              'sellerUid is required',
              'Description or image is required',
            ].some((token) => message.includes(token))
          ? 400
          : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}
