export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness only. It reports whether credentials are *present*, never their
 * values, so the endpoint can stay public while still making a misconfigured
 * deployment visible without issuing a real query.
 */
export function GET(): Response {
  return Response.json({
    service: 'asol-products',
    ok: true,
    configured: {
      productDatabase: Boolean(process.env.TURSO_PRODUCT_DATABASE_URL),
    },
  });
}
