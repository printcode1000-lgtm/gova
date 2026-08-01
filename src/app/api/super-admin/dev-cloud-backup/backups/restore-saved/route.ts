import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { devCloudBackupService } from "@/modules/dev-cloud-backup/services/dev-cloud-backup-service.server";
import type { DevCloudBackupRestoreMode } from "@/modules/dev-cloud-backup";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/restore-saved",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await request.json().catch(() => ({}))) as {
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
