import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { assertGooglePlayConsoleAllowed } from "@/features/google-play-console/server";
import { compareCachedBundleAnalyses } from "@asol/release-core/console-artifacts";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/analysis/compare", async () => {
    try {
      assertSuperAdminRequest(request); assertGooglePlayConsoleAllowed();
      const params = new URL(request.url).searchParams;
      return apiSuccess(await compareCachedBundleAnalyses(params.get("left") ?? "", params.get("right") ?? ""));
    } catch (error) { return mapServiceError(error); }
  });
}
