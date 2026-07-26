import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { dataHealthService } from "@/modules/data-health/services/data-health-service.server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/super-admin/data-health/history",
    async () => {
      try {
        assertSuperAdminRequest(request);
        return apiSuccess(await dataHealthService.history());
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
