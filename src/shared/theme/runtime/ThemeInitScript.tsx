import { withBasePath } from '@/core/config/public-env';
import { uiAttributes } from "@asol/ui-registry-core";

/** Blocking theme init — static file in `public/asol-theme-init.js` (see scripts/generate-theme-init-public.ts). */
export function ThemeInitScript() {
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script {...uiAttributes({ uid: "shared.theme.runtime.theme-init-script.script-AO6QQU", id: "shared.theme.runtime.theme-init-script.script" })} id="asol-theme-init" src={withBasePath('/asol-theme-init.js')} suppressHydrationWarning />
  );
}
