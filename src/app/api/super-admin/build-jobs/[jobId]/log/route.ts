import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { readBuildJobLog } from "@/modules/release-commands/services/build-job-runner.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/[jobId]/log", async () => {
    try {
      assertSuperAdminRequest(request);
      const { jobId } = await context.params;
      const offset = Number(new URL(request.url).searchParams.get("offset") || 0);
      return apiSuccess(await readBuildJobLog(jobId, offset));
    } catch (error) {
      if (error instanceof Error && error.message === "releaseJobLogNotFound") {
        const offset = Number(new URL(request.url).searchParams.get("offset") || 0);
        return apiSuccess({ text: "", nextOffset: offset, hasMore: false });
      }
      return mapServiceError(error);
    }
  });
}
