import { cancelBuildJob } from '@/control/build-jobs'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) { return runControlSuperAdminRoute(request, async () => cancelBuildJob((await context.params).jobId)); }
