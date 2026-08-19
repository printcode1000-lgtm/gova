export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

export function sellerErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status =
    message === 'productNotFound' || message.includes('NotFound')
      ? 404
      : message === 'productForbidden' || message.includes('Forbidden')
        ? 403
        : message === 'invalidProduct' || message.includes('required')
          ? 400
          : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}
