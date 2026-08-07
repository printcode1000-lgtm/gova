/**
 * Minimal HTTP helpers for the profiles service.
 *
 * The main app's `apiSuccess` / `mapServiceError` are deliberately not reused:
 * they reach into request tracing and system logging, which would pull a large
 * part of the application's module graph into a deployment that only reads
 * profiles.
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

/** Mirrors `mapServiceError` for the branches a read path can reach. */
export function profileErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status = /forbidden/i.test(message)
    ? 403
    : /not ?found/i.test(message)
      ? 404
      : /required|invalid|must/i.test(message)
        ? 400
        : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}
