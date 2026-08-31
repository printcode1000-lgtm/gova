import { devCloudBackupService } from '@/control/dev-cloud-backup'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function POST(request: Request) { return runControlSuperAdminRoute(request, () => devCloudBackupService.create()); }
