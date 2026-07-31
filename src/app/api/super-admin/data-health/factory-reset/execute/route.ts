import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { factoryResetService } from "@/modules/data-health/services/factory-reset-service.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/factory-reset/execute",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await request.json()) as {
          planId?: unknown;
          confirmationText?: unknown;
          currentPassword?: unknown;
        };
        return apiSuccess(
          await factoryResetService.execute({
            adminUid: admin.uid,
            planId: typeof body.planId === "string" ? body.planId.trim() : "",
            confirmationText:
              typeof body.confirmationText === "string"
                ? body.confirmationText
                : "",
            currentPassword:
              typeof body.currentPassword === "string"
                ? body.currentPassword
                : "",
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
