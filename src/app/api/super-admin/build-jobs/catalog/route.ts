import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { buildCommandCatalogPayload } from "@/modules/release-commands/services/build-job-runner.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/catalog", async () => {
    try {
      assertSuperAdminRequest(request);
      return apiSuccess(await buildCommandCatalogPayload());
    } catch (error) { return mapServiceError(error); }
  });
}
