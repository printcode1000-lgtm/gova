import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { factoryResetService } from "@/modules/data-health/services/factory-reset-service.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/factory-reset/plan",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        return apiSuccess(await factoryResetService.createPlan(admin.uid));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
