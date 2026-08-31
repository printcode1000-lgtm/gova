import { listBuildJobs, startBuildJob } from '@/control/build-jobs';
import type { StartBuildJobInput } from '@asol/release-core/console';
import { runControlSuperAdminJsonRoute, runControlSuperAdminRoute } from '@/control/super-admin-route';

export async function GET(request: Request): Promise<Response> {
  return runControlSuperAdminRoute(request, () => { const params = new URL(request.url).searchParams; return listBuildJobs(Number(params.get('page') || 1), Number(params.get('pageSize') || 20)); });
}
export async function POST(request: Request): Promise<Response> {
  return runControlSuperAdminJsonRoute<StartBuildJobInput, unknown>(request, ({ body }) => startBuildJob(body));
}
