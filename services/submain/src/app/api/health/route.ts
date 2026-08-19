export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({
    service: 'asol-submain',
    ok: true,
    configured: {
      productDatabase: Boolean(process.env.TURSO_PRODUCT_DATABASE_URL),
      ordersCore: Boolean(process.env.ORDERS_CORE_DATABASE_URL),
    },
  });
}
