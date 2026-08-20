import { credentialHealthResponse } from '@asol/service-runtime-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return credentialHealthResponse({
    service: 'asol-sub2main',
    credentials: {
      productDatabase: process.env.TURSO_PRODUCT_DATABASE_URL,
      profileCore: process.env.PROFILE_CORE_DATABASE_URL,
      objectStorage: process.env.R2_BUCKET_NAME,
    },
  });
}
