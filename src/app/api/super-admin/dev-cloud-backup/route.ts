import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { devCloudBackupService } from "@/features/dev-cloud-backup/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/super-admin/dev-cloud-backup",
    async () => {
      try {
        assertSuperAdminRequest(request);
        return apiSuccess(await devCloudBackupService.list());
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
