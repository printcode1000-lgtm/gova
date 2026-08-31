import { googlePlayStoreAssetsService } from '@/control/google-play'; import { runControlSuperAdminJsonRoute } from '@/control/super-admin-route';
import type { GooglePlayTrackMutationInput } from '@asol/google-play-store-assets-core';
export async function POST(request: Request) { return runControlSuperAdminJsonRoute<GooglePlayTrackMutationInput, unknown>(request, ({ body }) => googlePlayStoreAssetsService.updateTrack(body)); }
