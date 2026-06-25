import { FONT_SIZE_MAX, FONT_SIZE_MIN } from './defaults';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT, THEME_STORAGE_KEY } from './types';

/**
 * Inline script executed before paint. Generated from the same rules as applyDocumentTheme
 * so init + runtime stay in sync.
 */
export function buildThemeInitScript(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  const lightColor = JSON.stringify(THEME_COLOR_LIGHT);
  const darkColor = JSON.stringify(THEME_COLOR_DARK);
  const fontMin = FONT_SIZE_MIN;
  const fontMax = FONT_SIZE_MAX;

  return `(function(){try{var k=${key};var r=localStorage.getItem(k);if(!r)return;var p=JSON.parse(r);var x=p&&p.prefs?p.prefs:p;var d=document.documentElement;var m=x.themeMode||'system';var fs=Number(x.fontSize);if(fs>=${fontMin}&&fs<=${fontMax})d.style.setProperty('--gova-font-size-base',Math.round(fs)+'px');if(x.density)d.setAttribute('data-density',x.density);d.setAttribute('data-high-contrast',x.highContrast?'true':'false');var rm=x.reducedMotion;if(rm===true)rm='on';if(rm===false)rm='off';if(!rm)rm='system';d.setAttribute('data-reduced-motion',rm);var motion=rm==='on'||(rm==='system'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);d.setAttribute('data-reduced-motion-active',motion?'true':'false');d.setAttribute('data-theme-mode',m);var scheme='light';if(m==='dark')scheme='dark';else if(m==='system'){var q=window.matchMedia('(prefers-color-scheme: dark)');scheme=q.matches?'dark':'light';}d.setAttribute('data-theme',scheme);d.style.colorScheme=scheme;var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);}meta.setAttribute('content',scheme==='dark'?${darkColor}:${lightColor});}catch(e){}})();`;
}
