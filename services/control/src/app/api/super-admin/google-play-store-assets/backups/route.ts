import { googlePlayStoreAssetsService } from '@/control/google-play'; import { runControlSuperAdminRoute } from '@/control/super-admin-route';
export async function GET(request: Request) { return runControlSuperAdminRoute(request, () => googlePlayStoreAssetsService.listBackups()); }
