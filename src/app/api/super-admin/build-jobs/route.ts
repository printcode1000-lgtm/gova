import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { listBuildJobs, startBuildJob } from "@/modules/release-commands/services/build-job-runner.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs", async () => {
    try {
      assertSuperAdminRequest(request);
      return apiSuccess(await listBuildJobs());
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
