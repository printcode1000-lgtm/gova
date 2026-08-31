import { compareCachedBundleAnalyses } from '@/control/build-jobs'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function GET(request: Request) { return runControlSuperAdminRoute(request, () => { const p = new URL(request.url).searchParams; return compareCachedBundleAnalyses(p.get('left') ?? '', p.get('right') ?? ''); }); }
