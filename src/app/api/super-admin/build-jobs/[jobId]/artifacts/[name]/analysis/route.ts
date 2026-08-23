import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { assertGooglePlayConsoleAllowed } from "@/features/google-play-console/server";
import { resolveStoredArtifact } from "@asol/release-core/console-artifacts";
import { readBuildJobRecord } from "@/features/release-commands/server";
import { analyzeBundleArtifact } from "@asol/release-core/console-artifacts";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

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
