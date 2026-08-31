import { googlePlayStoreAssetsService } from '@/control/google-play'; import { runControlSuperAdminJsonRoute } from '@/control/super-admin-route';
export async function POST(request: Request) { return runControlSuperAdminJsonRoute<{ name?: unknown }, unknown>(request, ({ body }) => googlePlayStoreAssetsService.restoreBackup(typeof body.name === 'string' ? body.name : '')); }
