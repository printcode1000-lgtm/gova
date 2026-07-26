import { apiSuccess } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/dev-cloud-backup/backups/inspect",
    async () => {
      assertSuperAdminRequest(request);
      return apiSuccess({ validationError: "devCloudBackupManualZipDisabled" });
    },
  );
}
