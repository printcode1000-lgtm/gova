'use client';

import * as React from 'react';

import { applyDocumentTheme } from './apply-document-theme';
import { DEFAULT_THEME_PREFERENCES } from './defaults';
import {
  readThemePreferencesFromDb,
  writeThemePreferencesToDb,
} from './storage';
import type { ResolvedColorScheme } from './resolve-theme';
import type { ThemeMode, ThemePreferences } from './types';

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

const THEME_MODE_CYCLE: ThemeMode[] = ['light', 'dark'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<ThemePreferences>(DEFAULT_THEME_PREFERENCES);
  const [resolvedScheme, setResolvedScheme] = React.useState<ResolvedColorScheme>('light');
  const [hydrated, setHydrated] = React.useState(false);
  const preferencesRef = React.useRef(preferences);

  preferencesRef.current = preferences;

  const commitPreferences = React.useCallback(async (next: ThemePreferences) => {
    const normalized = { ...next };
    setPreferences(normalized);
    const scheme = applyDocumentTheme(normalized);
    setResolvedScheme(scheme);
    await writeThemePreferencesToDb(normalized);
  }, []);

  React.useEffect(() => {
    async function init() {
      const stored = await readThemePreferencesFromDb();
      await commitPreferences(stored);
      setHydrated(true);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme-hydrated', 'true');
      }
    }
    init();
  }, [commitPreferences]);

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
    const next = current === 'light' ? 'dark' : 'light';
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
