import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { artifactsForJob } from "@/features/release-commands/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/[jobId]/artifacts", async () => {
    try {
      assertSuperAdminRequest(request);
      const { jobId } = await context.params;
      return apiSuccess(await artifactsForJob(jobId));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
