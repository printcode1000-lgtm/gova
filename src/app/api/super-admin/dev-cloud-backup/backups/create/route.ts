import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { devCloudBackupService } from "@/features/dev-cloud-backup/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/create",
    async () => {
      try {
        assertSuperAdminRequest(request);
        return apiSuccess(await devCloudBackupService.create());
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
