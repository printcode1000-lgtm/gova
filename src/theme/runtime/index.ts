export type { ResolvedColorScheme } from './resolve-theme';
export type {
  ReducedMotionPreference,
  ThemeDensity,
  ThemeMode,
  ThemePreferences,
} from './types';
export {
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  THEME_STORAGE_KEY,
  THEME_STORAGE_VERSION,
} from './types';

export { DEFAULT_THEME_PREFERENCES, FONT_SIZE_MAX, FONT_SIZE_MIN } from './defaults';
export { resolveColorScheme, readSystemColorScheme } from './resolve-theme';
export { resolveReducedMotion, readSystemPrefersReducedMotion } from './resolve-reduced-motion';
export { applyDocumentTheme, applyThemeModeOnly } from './apply-document-theme';
export { buildThemeInitScript } from './build-theme-init-script';
export {
  clearStoredThemePreferences,
  normalizeThemePreferences,
  readLegacyThemeExtras,
  readStoredThemePreferences,
  writeStoredThemePreferences,
} from './storage';
export { THEME_INIT_SCRIPT } from './theme-init-script';
export { ThemeInitScript } from './ThemeInitScript';
export {
  ThemeProvider,
  useResolvedColorScheme,
  useThemeMode,
  useThemePreferences,
} from './ThemeProvider';
export type { ThemeContextValue } from './ThemeProvider';
