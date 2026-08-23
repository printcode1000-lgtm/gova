import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { assertGooglePlayConsoleAllowed } from "@/features/google-play-console/server";
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
