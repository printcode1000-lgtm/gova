import { assertSub2mainEnv, createSub2mainRuntime } from '@asol/sub2main-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Delete one stored image. This is the write account: it holds the R2 API token
 * the deletion needs, which the read accounts deliberately do not.
 *
 * `storageProfileId` is required rather than defaulted — a deletion aimed at the
 * wrong profile is not recoverable, so the caller must name it.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ imageKey: string }> },
): Promise<Response> {
  try {
    const { storage } = createSub2mainRuntime();
    assertSub2mainEnv();

    const { imageKey } = await context.params;
    const storageProfileId = new URL(request.url).searchParams.get('storageProfileId');
    if (!storageProfileId) throw new Error('storageProfileId is required');

    await storage.images.deleteImage(storageProfileId, imageKey);
    return jsonResponse(request, { deleted: true }, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
