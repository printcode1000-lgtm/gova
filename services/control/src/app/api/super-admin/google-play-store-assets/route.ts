import { googlePlayStoreAssetsService } from '@/control/google-play'; import { runControlSuperAdminJsonRoute, runControlSuperAdminRoute } from '@/control/super-admin-route';
import type { GooglePlayStoreAssetsUpdateInput } from '@asol/google-play-store-assets-core';
export async function GET(request: Request) { return runControlSuperAdminRoute(request, () => googlePlayStoreAssetsService.snapshot()); }
export async function PUT(request: Request) { return runControlSuperAdminJsonRoute<GooglePlayStoreAssetsUpdateInput, unknown>(request, ({ body }) => googlePlayStoreAssetsService.updateText(body)); }
