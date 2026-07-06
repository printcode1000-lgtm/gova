import { FONT_SIZE_MAX, FONT_SIZE_MIN } from './defaults';
import { resolveReducedMotion } from './resolve-reduced-motion';
import { resolveColorScheme, type ResolvedColorScheme } from './resolve-theme';
import {
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  type ThemeMode,
  type ThemePreferences,
} from './types';

function clampFontSize(size: number): number {
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));
}

function setMetaThemeColor(scheme: ResolvedColorScheme): void {
  if (typeof document === 'undefined') return;
  const color = scheme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

export function applyDocumentTheme(
  prefs: ThemePreferences,
  options?: {
    systemScheme?: ResolvedColorScheme;
    systemPrefersReducedMotion?: boolean;
    root?: HTMLElement;
  },
): ResolvedColorScheme {
  if (typeof document === 'undefined') return 'light';

  const root = options?.root ?? document.documentElement;
  const systemScheme = options?.systemScheme ?? 'light';
  const systemPrefersReduced = options?.systemPrefersReducedMotion ?? false;
  const scheme = resolveColorScheme(prefs.themeMode, systemScheme);

  root.setAttribute('data-theme', scheme);
  root.setAttribute('data-theme-mode', prefs.themeMode);
  root.setAttribute('data-density', prefs.density);
  root.setAttribute('data-high-contrast', prefs.highContrast ? 'true' : 'false');
  root.setAttribute('data-reduced-motion', prefs.reducedMotion);

  const motionActive = resolveReducedMotion(prefs.reducedMotion, systemPrefersReduced);
  root.setAttribute('data-reduced-motion-active', motionActive ? 'true' : 'false');

  root.style.setProperty('--gova-font-size-base', `${clampFontSize(prefs.fontSize)}px`);
  root.style.colorScheme = scheme;
  setMetaThemeColor(scheme);

  return scheme;
}

export function applyThemeModeOnly(
  themeMode: ThemeMode,
  options?: { systemScheme?: ResolvedColorScheme; root?: HTMLElement },
): ResolvedColorScheme {
  const root = options?.root ?? document.documentElement;
  const systemScheme = options?.systemScheme ?? 'light';
  const scheme = resolveColorScheme(themeMode, systemScheme);

  root.setAttribute('data-theme', scheme);
  root.setAttribute('data-theme-mode', themeMode);
  root.style.colorScheme = scheme;
  setMetaThemeColor(scheme);

  return scheme;
}
