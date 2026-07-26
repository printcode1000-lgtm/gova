import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import type { DevCloudBackupRestoreMode } from "@/modules/dev-cloud-backup";
import { devCloudBackupService } from "@/modules/dev-cloud-backup/services/dev-cloud-backup-service.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/inspect",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) throw new Error("devCloudBackupFileRequired");
        const mode =
          form.get("mode") === "replace"
            ? "replace"
            : ("merge" satisfies DevCloudBackupRestoreMode);
        const buffer = new Uint8Array(await file.arrayBuffer());
        return apiSuccess({
          inspect: devCloudBackupService.inspectZip(buffer),
          preview: devCloudBackupService.previewRestore(buffer, mode),
        });
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
