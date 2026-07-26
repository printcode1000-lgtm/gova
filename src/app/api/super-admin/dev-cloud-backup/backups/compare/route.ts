import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { devCloudBackupService } from "@/modules/dev-cloud-backup/services/dev-cloud-backup-service.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/compare",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) throw new Error("devCloudBackupFileRequired");
        return apiSuccess(
          await devCloudBackupService.compareWithCloud(
            new Uint8Array(await file.arrayBuffer()),
          ),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
