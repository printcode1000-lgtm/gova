import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { otaReleaseService } from '@/features/ota/services/ota-release-service.server';
import type { SetOtaReleaseApprovalInput } from '@/features/ota/types/ota.types';
import { runTracedBusinessRoute } from '../../../auth/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/ota/admin/releases', async () => {
    try {
      const url = new URL(request.url);
      return apiSuccess(
        await otaReleaseService.getAdminDashboard({
          uid: url.searchParams.get('uid') ?? '',
          phone: url.searchParams.get('phone') ?? '',
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/ota/admin/releases', async () => {
    try {
      return apiSuccess(
        await otaReleaseService.setApproval(
          (await request.json()) as SetOtaReleaseApprovalInput,
        ),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
