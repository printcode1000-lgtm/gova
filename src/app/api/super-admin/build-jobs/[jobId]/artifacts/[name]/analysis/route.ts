import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { assertGooglePlayConsoleAllowed } from "@/modules/google-play-console/domain/development-guard.server";
import { resolveStoredArtifact } from "@/modules/release-commands/services/build-job-artifacts.server";
import { readBuildJobRecord } from "@/modules/release-commands/services/build-job-runner.server";
import { analyzeBundleArtifact } from "@/modules/release-commands/services/bundle-analyzer.server";
import { runTracedBusinessRoute } from "../../../../../../auth/traced-route";

export async function GET(request: Request, context: { params: Promise<{ jobId: string; name: string }> }) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/[jobId]/artifacts/[name]/analysis", async () => {
    try {
      assertSuperAdminRequest(request); assertGooglePlayConsoleAllowed();
      const { jobId, name } = await context.params;
      const resolved = await resolveStoredArtifact(await readBuildJobRecord(jobId), name);
      if (!resolved || !/\.(?:apk|aab)$/i.test(resolved.fullPath)) throw new Error("releaseArtifactNotAnalyzable");
      return apiSuccess(await analyzeBundleArtifact(resolved.fullPath, resolved.descriptor.sha256));
    } catch (error) { return mapServiceError(error); }
  });
}
