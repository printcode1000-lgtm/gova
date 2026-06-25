import { DEFAULT_THEME_PREFERENCES, FONT_SIZE_MAX, FONT_SIZE_MIN } from './defaults';
import type {
  ReducedMotionPreference,
  StoredThemePreferences,
  ThemeDensity,
  ThemeMode,
  ThemePreferences,
} from './types';
import { THEME_STORAGE_KEY, THEME_STORAGE_VERSION } from './types';

const THEME_MODES = new Set<ThemeMode>(['light', 'dark', 'system']);
const DENSITIES = new Set<ThemeDensity>(['compact', 'comfortable', 'spacious']);
const REDUCED_MOTION = new Set<ReducedMotionPreference>(['system', 'on', 'off']);

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

function normalizeReducedMotion(value: unknown): ReducedMotionPreference {
  if (value === true) return 'on';
  if (value === false) return 'off';
  return pickEnum(value, REDUCED_MOTION, DEFAULT_THEME_PREFERENCES.reducedMotion);
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
    reducedMotion: normalizeReducedMotion(source.reducedMotion),
  };
}

export function readStoredThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_THEME_PREFERENCES };

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME_PREFERENCES };

    const parsed = JSON.parse(raw) as Partial<StoredThemePreferences> & Partial<ThemePreferences>;

    if (parsed.v === THEME_STORAGE_VERSION && parsed.prefs) {
      return normalizeThemePreferences(parsed.prefs);
    }

    return normalizeThemePreferences(parsed.prefs ?? parsed);
  } catch {
    return { ...DEFAULT_THEME_PREFERENCES };
  }
}

export function writeStoredThemePreferences(prefs: ThemePreferences): void {
  if (typeof window === 'undefined') return;

  const payload: StoredThemePreferences = {
    v: THEME_STORAGE_VERSION,
    prefs: normalizeThemePreferences(prefs),
  };

  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredThemePreferences(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(THEME_STORAGE_KEY);
}

/** Read legacy v1 theme blob fields that belonged in app preferences. */
export function readLegacyThemeExtras(): {
  locale?: string;
  localePreview?: string;
  timezone?: string;
} | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { prefs?: Record<string, unknown> } & Record<string, unknown>;
    const source = (parsed.prefs ?? parsed) as Record<string, unknown>;
    const locale = source.locale;
    const localePreview = source.localePreview;
    const timezone = source.timezone;
    if (
      typeof locale !== 'string' &&
      typeof localePreview !== 'string' &&
      typeof timezone !== 'string'
    ) {
      return null;
    }
    return {
      locale: typeof locale === 'string' ? locale : undefined,
      localePreview: typeof localePreview === 'string' ? localePreview : undefined,
      timezone: typeof timezone === 'string' ? timezone : undefined,
    };
  } catch {
    return null;
  }
}
