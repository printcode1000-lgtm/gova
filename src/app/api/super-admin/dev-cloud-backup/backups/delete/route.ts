import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { devCloudBackupService } from "@/features/dev-cloud-backup/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/delete",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await request.json().catch(() => ({}))) as {
          fileName?: string;
        };
        if (!body.fileName) throw new Error("devCloudBackupFileRequired");
        return apiSuccess(await devCloudBackupService.deleteSavedBackup(body.fileName));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
