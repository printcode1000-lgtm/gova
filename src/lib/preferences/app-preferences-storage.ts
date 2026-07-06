import { govaDbGet, govaDbSet, GOVA_DB_STORES } from '@/lib/gova-db';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/constants';
import type { Locale } from '@/lib/i18n/types';

import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from './app-preferences-types';

const LOCALES = new Set<Locale>(SUPPORTED_LOCALES);

function pickEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback;
}

function readLocale(source: Record<string, unknown>): Locale {
  const raw = source.locale;
  return pickEnum(raw, LOCALES, DEFAULT_LOCALE);
}

export function normalizeAppPreferences(
  input: Partial<AppPreferences> | null | undefined,
): AppPreferences {
  const source = (input ?? {}) as Record<string, unknown>;
  return {
    locale: readLocale(source),
  };
}

const APP_PREFS_DB_KEY = 'app-preferences';

export async function readAppPreferencesFromDb(): Promise<AppPreferences> {
  try {
    const raw = await govaDbGet<Partial<AppPreferences>>(GOVA_DB_STORES.APP_SETTINGS, APP_PREFS_DB_KEY);
    return normalizeAppPreferences(raw);
  } catch {
    return { ...DEFAULT_APP_PREFERENCES };
  }
}

export async function writeAppPreferencesToDb(prefs: AppPreferences): Promise<void> {
  await govaDbSet<AppPreferences>(
    GOVA_DB_STORES.APP_SETTINGS,
    APP_PREFS_DB_KEY,
    normalizeAppPreferences(prefs),
  );
}
