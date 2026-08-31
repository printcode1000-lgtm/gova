import { artifactsForJob } from '@/control/build-jobs'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) { return runControlSuperAdminRoute(request, async () => artifactsForJob((await context.params).jobId)); }
