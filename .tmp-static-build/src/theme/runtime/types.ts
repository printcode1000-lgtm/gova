export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';

/** Tri-state: follow OS, force on, or force off. */
export type ReducedMotionPreference = 'system' | 'on' | 'off';

/** Visual + accessibility preferences applied to the document. */
export type ThemePreferences = {
  themeMode: ThemeMode;
  fontSize: number;
  density: ThemeDensity;
  highContrast: boolean;
  reducedMotion: ReducedMotionPreference;
};

export const THEME_STORAGE_KEY = 'gova-theme-preferences' as const;
export const THEME_STORAGE_VERSION = 2 as const;

export type StoredThemePreferences = {
  v: typeof THEME_STORAGE_VERSION;
  prefs: ThemePreferences;
};

/** Mobile browser chrome colors (meta theme-color). */
export const THEME_COLOR_LIGHT = '#ffffff' as const;
export const THEME_COLOR_DARK = '#121212' as const;
