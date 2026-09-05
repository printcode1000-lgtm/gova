import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { devCloudBackupService } from "@/features/dev-cloud-backup/server";
import type { DevCloudBackupRestoreMode } from "@/features/dev-cloud-backup";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/restore-saved",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await readJsonBody<unknown>(request).catch(() => ({}))) as {
          fileName?: string;
          mode?: DevCloudBackupRestoreMode;
          confirmationText?: string;
        };
        if (!body.fileName) throw new Error("devCloudBackupFileRequired");
        const mode = body.mode === "replace" ? "replace" : "merge";
        return apiSuccess(
          await devCloudBackupService.restoreSavedBackup(
            body.fileName,
            mode,
            body.confirmationText ?? "",
          ),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
