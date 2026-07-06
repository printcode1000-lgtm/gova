'use client';

import * as React from 'react';

import { applyDocumentTheme } from './apply-document-theme';
import { DEFAULT_THEME_PREFERENCES } from './defaults';
import { readSystemPrefersReducedMotion } from './resolve-reduced-motion';
import { readSystemColorScheme } from './resolve-theme';
import {
  readStoredThemePreferences,
  writeStoredThemePreferences,
} from './storage';
import type { ResolvedColorScheme } from './resolve-theme';
import type { ThemeMode, ThemePreferences } from './types';
import { THEME_STORAGE_KEY } from './types';

export type ThemeContextValue = {
  preferences: ThemePreferences;
  resolvedScheme: ResolvedColorScheme;
  updatePreferences: (patch: Partial<ThemePreferences>) => void;
  resetPreferences: () => void;
  replacePreferences: (next: ThemePreferences) => void;
  toggleColorScheme: () => void;
  cycleThemeMode: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const THEME_MODE_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

function applyWithSystemSignals(prefs: ThemePreferences): ResolvedColorScheme {
  return applyDocumentTheme(prefs, {
    systemScheme: readSystemColorScheme(),
    systemPrefersReducedMotion: readSystemPrefersReducedMotion(),
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<ThemePreferences>(DEFAULT_THEME_PREFERENCES);
  const [resolvedScheme, setResolvedScheme] = React.useState<ResolvedColorScheme>('light');
  const [hydrated, setHydrated] = React.useState(false);
  const preferencesRef = React.useRef(preferences);

  preferencesRef.current = preferences;

  const commitPreferences = React.useCallback((next: ThemePreferences) => {
    const normalized = { ...next };
    setPreferences(normalized);
    const scheme = applyWithSystemSignals(normalized);
    setResolvedScheme(scheme);
    writeStoredThemePreferences(normalized);
  }, []);

  React.useEffect(() => {
    const stored = readStoredThemePreferences();
    commitPreferences(stored);
    setHydrated(true);
  }, [commitPreferences]);

  React.useEffect(() => {
    if (!hydrated) return undefined;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      commitPreferences(readStoredThemePreferences());
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [hydrated, commitPreferences]);

  React.useEffect(() => {
    if (!hydrated || preferences.themeMode !== 'system') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const scheme = applyDocumentTheme(preferencesRef.current, {
        systemScheme: media.matches ? 'dark' : 'light',
        systemPrefersReducedMotion: readSystemPrefersReducedMotion(),
      });
      setResolvedScheme(scheme);
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [hydrated, preferences.themeMode]);

  React.useEffect(() => {
    if (!hydrated || preferences.reducedMotion !== 'system') return undefined;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      applyDocumentTheme(preferencesRef.current, {
        systemScheme: readSystemColorScheme(),
        systemPrefersReducedMotion: media.matches,
      });
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [hydrated, preferences.reducedMotion]);

  const updatePreferences = React.useCallback(
    (patch: Partial<ThemePreferences>) => {
      commitPreferences({ ...preferencesRef.current, ...patch });
    },
    [commitPreferences],
  );

  const resetPreferences = React.useCallback(() => {
    commitPreferences({ ...DEFAULT_THEME_PREFERENCES });
  }, [commitPreferences]);

  const replacePreferences = React.useCallback(
    (next: ThemePreferences) => {
      commitPreferences(next);
    },
    [commitPreferences],
  );

  const toggleColorScheme = React.useCallback(() => {
    const nextMode: ThemeMode = resolvedScheme === 'dark' ? 'light' : 'dark';
    commitPreferences({ ...preferencesRef.current, themeMode: nextMode });
  }, [commitPreferences, resolvedScheme]);

  const cycleThemeMode = React.useCallback(() => {
    const current = preferencesRef.current.themeMode;
    const index = THEME_MODE_CYCLE.indexOf(current);
    const next = THEME_MODE_CYCLE[(index + 1) % THEME_MODE_CYCLE.length] ?? 'system';
    commitPreferences({ ...preferencesRef.current, themeMode: next });
  }, [commitPreferences]);

  const value = React.useMemo(
    () => ({
      preferences,
      resolvedScheme,
      updatePreferences,
      resetPreferences,
      replacePreferences,
      toggleColorScheme,
      cycleThemeMode,
    }),
    [
      preferences,
      resolvedScheme,
      updatePreferences,
      resetPreferences,
      replacePreferences,
      toggleColorScheme,
      cycleThemeMode,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreferences(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreferences must be used within ThemeProvider');
  }
  return context;
}

export function useResolvedColorScheme(): ResolvedColorScheme {
  return useThemePreferences().resolvedScheme;
}

export function useThemeMode(): ThemeMode {
  return useThemePreferences().preferences.themeMode;
}
