import type {
  ReducedMotionPreference,
  ThemeDensity,
  ThemeMode,
  ThemePreferences,
} from '@/theme/runtime';
import { DEFAULT_THEME_PREFERENCES } from '@/theme/runtime';

import type { AppPreferences, AppTimezone } from '@/lib/preferences';
import type { Locale } from '@/lib/i18n';

export type SettingsLocale = Locale;
export type SettingsThemeMode = ThemeMode;
export type SettingsDensity = ThemeDensity;
export type SettingsTimezone = AppTimezone;
export type SettingsReducedMotion = ReducedMotionPreference;
export type SettingsThemeState = ThemePreferences;
export type SettingsAppState = AppPreferences;

export const DEFAULT_THEME_SETTINGS = DEFAULT_THEME_PREFERENCES;

/** @deprecated Use `SettingsLocale` */
export type SettingsLocalePreview = Locale;
