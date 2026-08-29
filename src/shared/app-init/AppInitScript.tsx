import { withBasePath } from '@/core/config/public-env';
import { uiAttributes } from "@asol/ui-registry-core";

/** Blocking app init — static file in `public/asol-app-init.js` (see scripts/generate-app-init-public.ts). */
export function AppInitScript() {
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script {...uiAttributes({ uid: "shared.app-init.app-init-script.script-EZCw3o", id: "shared.app-init.app-init-script.script" })} id="asol-app-init" src={withBasePath('/asol-app-init.js')} suppressHydrationWarning />
  );
}
