export type {
  AppPreferences,
  LocalePreview,
} from './app-preferences-types';
export {
  DEFAULT_APP_PREFERENCES,
} from './app-preferences-types';
export {
  normalizeAppPreferences,
  readAppPreferencesFromDb,
  writeAppPreferencesToDb,
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
} from '@/shared/theme/runtime';
export type { ThemeContextValue } from '@/shared/theme/runtime';

export { useTranslation } from '@/shared/i18n';
