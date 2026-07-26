import { asolDbGet, asolDbSet, ASOL_DB_STORES } from '@/lib/asol-db';
import { DEFAULT_THEME_PREFERENCES, FONT_SIZE_MAX, FONT_SIZE_MIN } from './defaults';
import type { ThemeDensity, ThemeMode, ThemePreferences } from './types';

const THEME_MODES = new Set<ThemeMode>(['light', 'dark']);
const DENSITIES = new Set<ThemeDensity>(['compact', 'comfortable', 'spacious']);

function clampFontSize(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return DEFAULT_THEME_PREFERENCES.fontSize;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(num)));
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pickEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback;
}

export function normalizeThemePreferences(
  input: Partial<ThemePreferences> | null | undefined,
): ThemePreferences {
  const source = input ?? {};
  return {
    themeMode: pickEnum(source.themeMode, THEME_MODES, DEFAULT_THEME_PREFERENCES.themeMode),
    fontSize: clampFontSize(source.fontSize),
    density: pickEnum(source.density, DENSITIES, DEFAULT_THEME_PREFERENCES.density),
    highContrast: asBool(source.highContrast, DEFAULT_THEME_PREFERENCES.highContrast),
  };
}

const THEME_DB_KEY = 'theme-preferences';

export async function readThemePreferencesFromDb(): Promise<ThemePreferences> {
  try {
    const raw = await asolDbGet<Partial<ThemePreferences>>(ASOL_DB_STORES.APP_SETTINGS, THEME_DB_KEY);
    return normalizeThemePreferences(raw);
  } catch {
    return { ...DEFAULT_THEME_PREFERENCES };
  }
}

export async function writeThemePreferencesToDb(prefs: ThemePreferences): Promise<void> {
  await asolDbSet<ThemePreferences>(
    ASOL_DB_STORES.APP_SETTINGS,
    THEME_DB_KEY,
    normalizeThemePreferences(prefs),
  );
}
