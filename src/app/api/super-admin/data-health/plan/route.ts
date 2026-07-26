import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { dataHealthService } from "@/modules/data-health/services/data-health-service.server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";

interface PlanBody {
  issueIds?: unknown;
}

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/plan",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await request.json()) as PlanBody;
        const issueIds = Array.isArray(body.issueIds)
          ? body.issueIds.filter((id): id is string => typeof id === "string")
          : [];
        return apiSuccess(
          await dataHealthService.createCleanupPlan({
            adminUid: admin.uid,
            issueIds,
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
