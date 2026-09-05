import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { devCloudBackupService } from "@/features/dev-cloud-backup/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/inspect-saved",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await readJsonBody<unknown>(request).catch(() => ({}))) as {
          fileName?: string;
        };
        if (!body.fileName) throw new Error("devCloudBackupFileRequired");
        return apiSuccess(await devCloudBackupService.inspectSavedBackup(body.fileName));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
