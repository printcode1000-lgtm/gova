import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { otaReleaseService } from '@/features/ota/services/ota-release-service.server';
import { runTracedBusinessRoute } from '../../../../auth/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/ota/admin/releases/diff', async () => {
    try {
      const url = new URL(request.url);
      return apiSuccess(
        await otaReleaseService.getReleaseDiff({
          identity: {
            uid: url.searchParams.get('uid') ?? '',
            phone: url.searchParams.get('phone') ?? '',
          },
          baseReleaseId: url.searchParams.get('baseReleaseId') ?? '',
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
