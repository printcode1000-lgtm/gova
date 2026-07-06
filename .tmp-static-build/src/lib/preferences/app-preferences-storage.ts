import { applyDocumentLocale } from '@/lib/i18n/apply-locale';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/constants';
import type { Locale } from '@/lib/i18n/types';
import { readLegacyThemeExtras } from '@/theme/runtime';

import {
  APP_PREFERENCES_STORAGE_KEY,
  APP_PREFERENCES_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
  type AppTimezone,
  type StoredAppPreferences,
} from './app-preferences-types';

const LOCALES = new Set<Locale>(SUPPORTED_LOCALES);
const TIMEZONES = new Set<AppTimezone>(['cairo', 'mecca', 'dubai']);

function pickEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback;
}

function readLocale(source: Record<string, unknown>): Locale {
  const raw = source.locale ?? source.localePreview;
  return pickEnum(raw, LOCALES, DEFAULT_LOCALE);
}

export function normalizeAppPreferences(
  input: Partial<AppPreferences> | null | undefined,
): AppPreferences {
  const source = (input ?? {}) as Record<string, unknown>;
  return {
    locale: readLocale(source),
    timezone: pickEnum(source.timezone, TIMEZONES, DEFAULT_APP_PREFERENCES.timezone),
  };
}

function migrateFromLegacyTheme(): Partial<AppPreferences> | null {
  const legacy = readLegacyThemeExtras();
  if (!legacy) return null;
  const locale =
    legacy.locale === 'en' || legacy.locale === 'ar'
      ? legacy.locale
      : legacy.localePreview === 'en' || legacy.localePreview === 'ar'
        ? legacy.localePreview
        : undefined;
  return {
    locale,
    timezone:
      legacy.timezone === 'cairo' || legacy.timezone === 'mecca' || legacy.timezone === 'dubai'
        ? legacy.timezone
        : undefined,
  };
}

export function readStoredAppPreferences(): AppPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_APP_PREFERENCES };

  try {
    const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
    if (!raw) {
    if (!raw) {
      const legacy = migrateFromLegacyTheme();
      return normalizeAppPreferences(legacy ?? DEFAULT_APP_PREFERENCES);
    }
    }

    const parsed = JSON.parse(raw) as Partial<StoredAppPreferences> & Record<string, unknown>;
    if (parsed.v === APP_PREFERENCES_STORAGE_VERSION && parsed.prefs) {
      return normalizeAppPreferences(parsed.prefs as Partial<AppPreferences>);
    }

    return normalizeAppPreferences((parsed.prefs as Partial<AppPreferences>) ?? parsed);
  } catch {
    return { ...DEFAULT_APP_PREFERENCES };
  }
}

export function writeStoredAppPreferences(prefs: AppPreferences): void {
  if (typeof window === 'undefined') return;

  const payload: StoredAppPreferences = {
    v: APP_PREFERENCES_STORAGE_VERSION,
    prefs: normalizeAppPreferences(prefs),
  };

  window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredAppPreferences(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(APP_PREFERENCES_STORAGE_KEY);
}

export function applyDocumentAppPreferences(prefs: AppPreferences): void {
  applyDocumentLocale(prefs.locale);
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-timezone', prefs.timezone);
}
