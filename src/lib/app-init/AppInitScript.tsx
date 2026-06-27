import { publicEnv } from '@/core/config/public-env';

/** Blocking app init — static file in `public/gova-app-init.js` (see scripts/generate-app-init-public.ts). */
export function AppInitScript() {
  const basePath = publicEnv.basePath;
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script id="gova-app-init" src={`${basePath}/gova-app-init.js`} suppressHydrationWarning />
  );
}
