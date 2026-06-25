import { APP_PREFERENCES_STORAGE_KEY, DEFAULT_APP_PREFERENCES } from '@/lib/preferences/app-preferences-types';
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from '@/theme/runtime/defaults';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT, THEME_STORAGE_KEY } from '@/theme/runtime/types';

/**
 * Blocking script applied before first paint.
 * Restores theme + locale from localStorage so there is no flash of wrong theme or direction.
 */
export function buildAppInitScript(): string {
  const themeKey = JSON.stringify(THEME_STORAGE_KEY);
  const appKey = JSON.stringify(APP_PREFERENCES_STORAGE_KEY);
  const defaultLocale = JSON.stringify(DEFAULT_APP_PREFERENCES.locale);
  const lightColor = JSON.stringify(THEME_COLOR_LIGHT);
  const darkColor = JSON.stringify(THEME_COLOR_DARK);
  const fontMin = FONT_SIZE_MIN;
  const fontMax = FONT_SIZE_MAX;

  return `(function(){try{var d=document.documentElement;var ak=${appKey};var ar=localStorage.getItem(ak);var loc=${defaultLocale};if(ar){var ap=JSON.parse(ar);var aprefs=ap&&ap.prefs?ap.prefs:ap;loc=aprefs.locale||aprefs.localePreview||loc;}d.setAttribute('data-locale',loc);d.setAttribute('lang',loc==='ar'?'ar':'en');d.setAttribute('dir',loc==='ar'?'rtl':'ltr');var tk=${themeKey};var tr=localStorage.getItem(tk);if(!tr)return;var p=JSON.parse(tr);var x=p&&p.prefs?p.prefs:p;var m=x.themeMode||'system';var fs=Number(x.fontSize);if(fs>=${fontMin}&&fs<=${fontMax})d.style.setProperty('--gova-font-size-base',Math.round(fs)+'px');if(x.density)d.setAttribute('data-density',x.density);d.setAttribute('data-high-contrast',x.highContrast?'true':'false');var rm=x.reducedMotion;if(rm===true)rm='on';if(rm===false)rm='off';if(!rm)rm='system';d.setAttribute('data-reduced-motion',rm);var motion=rm==='on'||(rm==='system'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);d.setAttribute('data-reduced-motion-active',motion?'true':'false');d.setAttribute('data-theme-mode',m);var scheme='light';if(m==='dark')scheme='dark';else if(m==='system'){var q=window.matchMedia('(prefers-color-scheme: dark)');scheme=q.matches?'dark':'light';}d.setAttribute('data-theme',scheme);d.style.colorScheme=scheme;var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);}meta.setAttribute('content',scheme==='dark'?${darkColor}:${lightColor});}catch(e){}})();`;
}
