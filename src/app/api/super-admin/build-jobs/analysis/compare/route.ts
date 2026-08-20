import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { assertGooglePlayConsoleAllowed } from "@/modules/google-play-console/domain/development-guard.server";
import { compareCachedBundleAnalyses } from "@/modules/release-commands/services/bundle-analyzer.server";
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
