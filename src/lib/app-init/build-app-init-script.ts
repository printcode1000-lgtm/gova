import { DEFAULT_APP_PREFERENCES } from '@/lib/preferences/app-preferences-types';
import { THEME_COLOR_LIGHT } from '@/theme/runtime/types';

/**
 * Blocking script applied before first paint.
 * Initializes default theme + locale attributes.
 */
export function buildAppInitScript(): string {
  const defaultLocale = JSON.stringify(DEFAULT_APP_PREFERENCES.locale);
  const lightColor = JSON.stringify(THEME_COLOR_LIGHT);

  return `(function(){try{var d=document.documentElement;var loc=${defaultLocale};d.setAttribute('data-locale',loc);d.setAttribute('lang',loc==='ar'?'ar':'en');d.setAttribute('dir',loc==='ar'?'rtl':'ltr');d.setAttribute('data-theme','light');d.setAttribute('data-theme-mode','light');d.setAttribute('data-density','comfortable');d.setAttribute('data-high-contrast','false');d.style.colorScheme='light';var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);}meta.setAttribute('content',${lightColor});}catch(e){}})();`;
}
