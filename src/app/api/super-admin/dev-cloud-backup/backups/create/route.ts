import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { devCloudBackupService } from "@/modules/dev-cloud-backup/services/dev-cloud-backup-service.server";
import type { DevCloudBackupScope } from "@/modules/dev-cloud-backup";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/create",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await request.json().catch(() => ({}))) as {
          scope?: DevCloudBackupScope;
        };
        const scope = body.scope === "all-r2" ? "all-r2" : "known-project-files";
        return apiSuccess(await devCloudBackupService.create(scope));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
