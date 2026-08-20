import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { cancelBuildJob } from "@/modules/release-commands/services/build-job-runner.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  return runTracedBusinessRoute("POST /api/super-admin/build-jobs/[jobId]/cancel", async () => {
    try {
      assertSuperAdminRequest(request);
      const { jobId } = await context.params;
      return apiSuccess(await cancelBuildJob(jobId));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
