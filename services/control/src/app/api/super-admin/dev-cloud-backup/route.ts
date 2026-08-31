import { devCloudBackupService } from '@/control/dev-cloud-backup'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function GET(request: Request) { return runControlSuperAdminRoute(request, () => devCloudBackupService.list()); }
