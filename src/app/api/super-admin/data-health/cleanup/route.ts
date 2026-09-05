import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { dataHealthService } from "@/features/data-health/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

interface CleanupBody {
  planId?: unknown;
  confirmationText?: unknown;
}

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/cleanup",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await readJsonBody<unknown>(request)) as CleanupBody;
        return apiSuccess(
          await dataHealthService.cleanup({
            adminUid: admin.uid,
            planId:
              typeof body.planId === "string" ? body.planId.trim() : "",
            confirmationText:
              typeof body.confirmationText === "string"
                ? body.confirmationText
                : "",
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
