import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { dataHealthService } from "@/modules/data-health/services/data-health-service.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/quarantine/release",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await request.json()) as { quarantineId?: unknown };
        return apiSuccess(
          await dataHealthService.releaseQuarantine({
            adminUid: admin.uid,
            quarantineId:
              typeof body.quarantineId === "string"
                ? body.quarantineId.trim()
                : "",
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
