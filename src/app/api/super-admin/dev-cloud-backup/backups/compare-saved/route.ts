import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { devCloudBackupService } from "@/modules/dev-cloud-backup/services/dev-cloud-backup-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/compare-saved",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await request.json().catch(() => ({}))) as {
          fileName?: string;
        };
        if (!body.fileName) throw new Error("devCloudBackupFileRequired");
        return apiSuccess(
          await devCloudBackupService.compareSavedBackupWithCloud(body.fileName),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
