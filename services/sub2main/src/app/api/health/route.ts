export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({
    service: 'asol-sub2main',
    ok: true,
    configured: {
      productDatabase: Boolean(process.env.TURSO_PRODUCT_DATABASE_URL),
      profileCore: Boolean(process.env.PROFILE_CORE_DATABASE_URL),
      objectStorage: Boolean(process.env.R2_BUCKET_NAME),
    },
  });
}
