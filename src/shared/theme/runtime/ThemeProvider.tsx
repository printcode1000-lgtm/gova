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
import { reportPreAuthFailure } from '@/features/system-logs';
import { ThemeContext, type ThemeContextValue } from './theme-context';
import { THEME_MODE_CYCLE } from './theme-mode-cycle';

export type { ThemeContextValue } from './theme-context';

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
      try {
        const stored = await readThemePreferencesFromDb();
        await commitPreferences(stored);
      } catch (error) {
        reportPreAuthFailure('initialize-theme-preferences', error);
      } finally {
        setHydrated(true);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme-hydrated', 'true');
        }
      }
    }
    init();
  }, [commitPreferences]);

  const updatePreferences = React.useCallback(
    (patch: Partial<ThemePreferences>) => {
      void commitPreferences({ ...preferencesRef.current, ...patch }).catch((error) => {
        reportPreAuthFailure('update-theme-preferences', error);
      });
    },
    [commitPreferences],
  );

  const resetPreferences = React.useCallback(() => {
    void commitPreferences({ ...DEFAULT_THEME_PREFERENCES }).catch((error) => {
      reportPreAuthFailure('reset-theme-preferences', error);
    });
  }, [commitPreferences]);

  const replacePreferences = React.useCallback(
    (next: ThemePreferences) => {
      void commitPreferences(next).catch((error) => {
        reportPreAuthFailure('replace-theme-preferences', error);
      });
    },
    [commitPreferences],
  );

  const toggleColorScheme = React.useCallback(() => {
    const nextMode: ThemeMode = resolvedScheme === 'dark' ? 'light' : 'dark';
    void commitPreferences({ ...preferencesRef.current, themeMode: nextMode }).catch((error) => {
      reportPreAuthFailure('toggle-theme-color-scheme', error);
    });
  }, [commitPreferences, resolvedScheme]);

  const cycleThemeMode = React.useCallback(() => {
    const current = preferencesRef.current.themeMode;
    const currentIndex = THEME_MODE_CYCLE.indexOf(current);
    const next = THEME_MODE_CYCLE[(currentIndex + 1) % THEME_MODE_CYCLE.length] ?? 'light';
    void commitPreferences({ ...preferencesRef.current, themeMode: next }).catch((error) => {
      reportPreAuthFailure('cycle-theme-mode', error);
    });
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
