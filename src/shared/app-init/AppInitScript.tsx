import { withBasePath } from '@/core/config/public-env';

/** Blocking app init — static file in `public/asol-app-init.js` (see scripts/generate-app-init-public.ts). */
export function AppInitScript() {
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script id='shared-app-init-appinitscript-script-1-to3soi' src={withBasePath('/asol-app-init.js')} suppressHydrationWarning />
  );
}
