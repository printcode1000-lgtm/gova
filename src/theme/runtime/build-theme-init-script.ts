import { THEME_COLOR_LIGHT } from './types';

/**
 * Inline script executed before paint.
 * Sets default light theme attributes — actual preferences are
 * loaded asynchronously from GovaDB by ThemeProvider after hydration.
 */
export function buildThemeInitScript(): string {
  const lightColor = JSON.stringify(THEME_COLOR_LIGHT);
  return `(function(){try{var d=document.documentElement;d.setAttribute('data-theme','light');d.setAttribute('data-theme-mode','light');d.style.colorScheme='light';var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);}meta.setAttribute('content',${lightColor});}catch(e){}})();`;
}
