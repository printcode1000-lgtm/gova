import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { dataHealthService } from "@/features/data-health/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/data-health", async () => {
    try {
      assertSuperAdminRequest(request);
      return apiSuccess(await dataHealthService.scan());
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
