import { listCachedBundleAnalyses } from '@/control/build-jobs'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function GET(request: Request) { return runControlSuperAdminRoute(request, () => listCachedBundleAnalyses()); }
