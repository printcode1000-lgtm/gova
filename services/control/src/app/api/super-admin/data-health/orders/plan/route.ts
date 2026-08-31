import { orderPurgeService } from '@/control/data-health'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function POST(request: Request) { return runControlSuperAdminRoute(request, ({ admin }) => orderPurgeService.createPlan(admin.uid)); }
