import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { otaReleaseService } from '@asol/ota-core/server';
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { registerOtaCoreServerPorts } from "@/features/ota/server";

// Supplies ota-core with the server-side log reader and the super-admin predicate.
// Without it the release console would render with no adoption data and no admin.
registerOtaCoreServerPorts();

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
