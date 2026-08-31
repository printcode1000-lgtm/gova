import 'server-only';

/** Control owns Google Play administration; exact service seams only, no gova feature barrel. */
export { googlePlayConsoleEnvironment } from '@/features/google-play-console/domain/development-guard.server';
export { googlePlayConsoleService } from '@/features/google-play-console/server/services/google-play-console-service.server';
export { googlePlayStoreAssetsService } from '@/features/google-play-console/server/services/google-play-store-assets-service.server';
