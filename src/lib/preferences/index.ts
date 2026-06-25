export type {
  AppPreferences,
  AppTimezone,
  LocalePreview,
} from './app-preferences-types';
export {
  APP_PREFERENCES_STORAGE_KEY,
  DEFAULT_APP_PREFERENCES,
} from './app-preferences-types';
export {
  applyDocumentAppPreferences,
  clearStoredAppPreferences,
  normalizeAppPreferences,
  readStoredAppPreferences,
  writeStoredAppPreferences,
} from './app-preferences-storage';
export {
  PreferencesProvider,
  useAppPreferences,
  type AppPreferencesContextValue,
} from './PreferencesProvider';

export {
  useResolvedColorScheme,
  useThemeMode,
  useThemePreferences,
} from '@/theme/runtime';
export type { ThemeContextValue } from '@/theme/runtime';

export { useTranslation } from '@/lib/i18n';
