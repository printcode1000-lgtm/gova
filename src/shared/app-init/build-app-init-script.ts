import { DEFAULT_APP_PREFERENCES } from '@/shared/preferences/app-preferences-types';
import { THEME_COLOR_LIGHT } from '@/shared/theme/runtime/types';

/**
 * Blocking script applied before first paint.
 * Initializes default theme + locale attributes.
 *
 * Its WhatsApp helper repeats what the phone domain does — fold Arabic and
 * Persian digits, then address the number by its international digits — because
 * this script runs before any module loads and cannot import that domain. A
 * number still spelled the legacy Egyptian way is the one case it can complete
 * on its own.
 */
export function buildAppInitScript(): string {
  const defaultLocale = JSON.stringify(DEFAULT_APP_PREFERENCES.locale);
  const lightColor = JSON.stringify(THEME_COLOR_LIGHT);

  return `(function(){try{var d=document.documentElement;var loc=${defaultLocale};d.setAttribute('data-locale',loc);d.setAttribute('lang',loc==='ar'?'ar':'en');d.setAttribute('dir',loc==='ar'?'rtl':'ltr');d.setAttribute('data-theme','light');d.setAttribute('data-theme-mode','light');d.setAttribute('data-density','comfortable');d.setAttribute('data-high-contrast','false');d.style.colorScheme='light';var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);}meta.setAttribute('content',${lightColor});window.sendWhatsappVerificationCode=async function(phone,code){var textMsg=window.langu?window.langu('wa_msg_template',{code:code}):'Your verification code is: '+code;var cleanPhone=phone.replace(/[\u0660-\u0669]/g,function(x){return String.fromCharCode(x.charCodeAt(0)-1632);}).replace(/[\u06f0-\u06f9]/g,function(x){return String.fromCharCode(x.charCodeAt(0)-1776);}).replace(/[^0-9]/g,'');if(cleanPhone.length===11&&cleanPhone.charAt(0)==='0'){cleanPhone='20'+cleanPhone.slice(1);}var waUrl='https://wa.me/'+cleanPhone+'?text='+encodeURIComponent(textMsg);window.open(waUrl,'_blank');console.log('[WhatsApp Link] Done Attempt : '+waUrl);};}catch(e){console.error('[Asol][PreAuth] app-init failed',{name:e&&e.name||typeof e,message:e&&e.message||String(e)});}})();`;
}
