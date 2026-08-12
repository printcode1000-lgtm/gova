export type ThemeMode = 'light' | 'dark';

export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';

/** Visual + accessibility preferences applied to the document. */
export type ThemePreferences = {
  themeMode: ThemeMode;
  fontSize: number;
  density: ThemeDensity;
  highContrast: boolean;
};

/** Mobile browser chrome colors (meta theme-color). */
export const THEME_COLOR_LIGHT = '#ffffff' as const;
export const THEME_COLOR_DARK = '#121212' as const;
