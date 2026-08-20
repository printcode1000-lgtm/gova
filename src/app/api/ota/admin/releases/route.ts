import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { otaReleaseService } from '@asol/ota-core/server';
import type { SetOtaReleaseApprovalInput } from '@asol/ota-core';
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { registerOtaCoreServerPorts } from "@/features/ota/server";

// Supplies ota-core with the server-side log reader and the super-admin predicate.
// Without it the release console would render with no adoption data and no admin.
registerOtaCoreServerPorts();

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
