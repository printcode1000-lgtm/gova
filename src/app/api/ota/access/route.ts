import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { otaReleaseService } from '@/features/ota/services/ota-release-service.server';
import type { OtaIdentity } from '@/features/ota/types/ota.types';
import { runTracedBusinessRoute } from '../../auth/traced-route';

interface OtaAccessBody {
  releaseId?: string;
  version?: string;
  identity?: OtaIdentity;
}

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/ota/access', async () => {
    try {
      const body = (await request.json()) as OtaAccessBody;
      return apiSuccess(
        await otaReleaseService.getAccess({
          releaseId: body.releaseId?.trim() ?? '',
          version: body.version?.trim() ?? '',
          identity: body.identity,
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
