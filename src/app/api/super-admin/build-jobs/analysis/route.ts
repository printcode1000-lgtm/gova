import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { assertGooglePlayConsoleAllowed } from "@/modules/google-play-console/domain/development-guard.server";
import { listCachedBundleAnalyses } from "@asol/release-core/console-artifacts";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/analysis", async () => {
    try {
      assertSuperAdminRequest(request);
      assertGooglePlayConsoleAllowed();
      return apiSuccess(await listCachedBundleAnalyses());
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
