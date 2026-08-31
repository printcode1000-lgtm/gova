import { dataHealthService } from '@/control/data-health'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function GET(request: Request) { return runControlSuperAdminRoute(request, () => dataHealthService.compareSchema()); }
