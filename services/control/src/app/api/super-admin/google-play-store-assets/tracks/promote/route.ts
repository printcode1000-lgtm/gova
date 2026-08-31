import { googlePlayStoreAssetsService } from '@/control/google-play'; import { runControlSuperAdminJsonRoute } from '@/control/super-admin-route';
import type { GooglePlayPromoteInput } from '@asol/google-play-store-assets-core';
export async function POST(request: Request) { return runControlSuperAdminJsonRoute<GooglePlayPromoteInput, unknown>(request, ({ body }) => googlePlayStoreAssetsService.promoteRelease(body)); }
