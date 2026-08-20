import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { listBuildJobs, startBuildJob } from "@/modules/release-commands/services/build-job-runner.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs", async () => {
    try {
      assertSuperAdminRequest(request);
      const params = new URL(request.url).searchParams;
      return apiSuccess(await listBuildJobs(Number(params.get("page") || 1), Number(params.get("pageSize") || 20)));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/super-admin/build-jobs", async () => {
    try {
      assertSuperAdminRequest(request);
      return apiSuccess(await startBuildJob(await request.json()));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
