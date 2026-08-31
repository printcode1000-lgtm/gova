import { googlePlayStoreAssetsService } from '@/control/google-play'; import { runControlSuperAdminJsonRoute } from '@/control/super-admin-route';
export async function POST(request: Request) { return runControlSuperAdminJsonRoute<{ language?: unknown }, unknown>(request, ({ body }) => googlePlayStoreAssetsService.deleteListing(typeof body.language === 'string' ? body.language : '')); }
