import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { devCloudBackupService } from "@/modules/dev-cloud-backup/services/dev-cloud-backup-service.server";
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
