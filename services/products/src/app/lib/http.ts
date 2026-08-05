/**
 * Minimal HTTP helpers for the products service.
 *
 * The main app's `apiSuccess`/`mapServiceError` are deliberately not reused:
 * they reach into system logging and request tracing, which would pull a large
 * part of the application's module graph into a deployment that only reads
 * products.
 *
 * Error codes match the main app's product routes exactly, so a client cannot
 * tell which deployment answered.
 */

export function corsHeaders(request: Request): Record<string, string> {
  // The browser is the only caller. These endpoints are read-only and carry no
  // credentials — `credentials: "omit"` on the bridge side — so a permissive
  // origin cannot be used to ride on someone's session.
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Asol-Trace-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/** Mirrors the status mapping in `src/app/api/products/route.ts`. */
export function errorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status =
    message === 'productNotFound'
      ? 404
      : message === 'productForbidden'
        ? 403
        : message === 'invalidProduct'
          ? 400
          : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}

/** Mirrors the status mapping in `src/app/api/products/reviews/route.ts`. */
export function reviewErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status =
    message.includes('NotFound') || message === 'reviewNotFound'
      ? 404
      : message.includes('Forbidden') || message === 'sellerCannotReview'
        ? 403
        : ['invalidReview', 'reviewAlreadyExists', 'reviewsDisabled', 'userNotFound'].includes(
              message,
            )
          ? 400
          : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}

/** Generic mapping for the search routes, which use `mapServiceError` upstream. */
export function searchErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status = message === 'invalidSearchCategory' ? 400 : 500;
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}
