import { dataHealthService } from '@/control/data-health';
import { runControlSuperAdminJsonRoute } from '@/control/super-admin-route';
interface CleanupBody { planId?: unknown; confirmationText?: unknown; }
export async function POST(request: Request) { return runControlSuperAdminJsonRoute<CleanupBody, unknown>(request, ({ admin, body }) => dataHealthService.cleanup({ adminUid: admin.uid, planId: typeof body.planId === 'string' ? body.planId.trim() : '', confirmationText: typeof body.confirmationText === 'string' ? body.confirmationText : '' })); }
