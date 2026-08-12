import { withBasePath } from '@/core/config';

/** Blocking app init — static file in `public/asol-app-init.js` (see scripts/generate-app-init-public.ts). */
export function AppInitScript() {
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script id="asol-app-init" src={withBasePath('/asol-app-init.js')} suppressHydrationWarning />
  );
}
