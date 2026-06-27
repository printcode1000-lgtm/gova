import { publicEnv } from '@/core/config/public-env';

/** Blocking theme init — static file in `public/gova-theme-init.js` (see scripts/generate-theme-init-public.ts). */
export function ThemeInitScript() {
  const basePath = publicEnv.basePath;
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script id="gova-theme-init" src={`${basePath}/gova-theme-init.js`} suppressHydrationWarning />
  );
}
