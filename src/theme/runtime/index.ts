export type { ResolvedColorScheme } from './resolve-theme';
export type {
  ThemeDensity,
  ThemeMode,
  ThemePreferences,
} from './types';
export {
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
} from './types';

export { DEFAULT_THEME_PREFERENCES, FONT_SIZE_MAX, FONT_SIZE_MIN } from './defaults';
export { resolveColorScheme } from './resolve-theme';
export { applyDocumentTheme } from './apply-document-theme';
export { buildThemeInitScript } from './build-theme-init-script';
export {
  normalizeThemePreferences,
  readThemePreferencesFromDb,
  writeThemePreferencesToDb,
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
