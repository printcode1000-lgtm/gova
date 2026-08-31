import { dataHealthService } from '@/control/data-health';
import { runControlSuperAdminJsonRoute } from '@/control/super-admin-route';
interface PlanBody { issueIds?: unknown; }
export async function POST(request: Request) { return runControlSuperAdminJsonRoute<PlanBody, unknown>(request, ({ admin, body }) => dataHealthService.createCleanupPlan({ adminUid: admin.uid, issueIds: Array.isArray(body.issueIds) ? body.issueIds.filter((id): id is string => typeof id === 'string') : [] })); }
