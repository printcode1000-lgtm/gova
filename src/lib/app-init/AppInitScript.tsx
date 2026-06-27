import { withBasePath } from '@/core/config';

/** Blocking app init — static file in `public/gova-app-init.js` (see scripts/generate-app-init-public.ts). */
export function AppInitScript() {
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script id="gova-app-init" src={withBasePath('/gova-app-init.js')} suppressHydrationWarning />
  );
}
