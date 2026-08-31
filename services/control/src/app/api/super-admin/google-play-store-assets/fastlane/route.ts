import { googlePlayStoreAssetsService } from '@/control/google-play'; import { runControlSuperAdminJsonRoute } from '@/control/super-admin-route';
import type { GooglePlayFastlaneAction } from '@asol/google-play-store-assets-core';
export async function POST(request: Request) { return runControlSuperAdminJsonRoute<{ action?: GooglePlayFastlaneAction; confirmation?: string }, unknown>(request, ({ body }) => { if (!body.action) throw new Error('googlePlayFastlaneActionRequired'); return googlePlayStoreAssetsService.runFastlaneAction(body.action, body.confirmation); }); }
