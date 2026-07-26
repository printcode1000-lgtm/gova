import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { dataHealthService } from "@/modules/data-health/services/data-health-service.server";
import { runTracedBusinessRoute } from "../../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/history/audit/clear",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await request.json().catch(() => ({}))) as {
          confirm?: unknown;
        };
        return apiSuccess(
          await dataHealthService.clearCleanupAudit({
            adminUid: admin.uid,
            confirm: typeof body.confirm === "string" ? body.confirm : "",
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
