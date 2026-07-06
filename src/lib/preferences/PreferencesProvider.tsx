'use client';

import { ThemeProvider } from '@/theme/runtime';
import * as React from 'react';

import {
  APP_PREFERENCES_STORAGE_KEY,
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from './app-preferences-types';
import {
  applyDocumentAppPreferences,
  readStoredAppPreferences,
  writeStoredAppPreferences,
} from './app-preferences-storage';

export type AppPreferencesContextValue = {
  preferences: AppPreferences;
  updatePreferences: (patch: Partial<AppPreferences>) => void;
  resetPreferences: () => void;
};

const AppPreferencesContext = React.createContext<AppPreferencesContextValue | null>(null);

function AppPreferencesScope({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const preferencesRef = React.useRef(preferences);
  preferencesRef.current = preferences;

  const commitPreferences = React.useCallback((next: AppPreferences) => {
    setPreferences(next);
    applyDocumentAppPreferences(next);
    writeStoredAppPreferences(next);
  }, []);

  React.useEffect(() => {
    commitPreferences(readStoredAppPreferences());
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-hydrated', 'true');
    }
  }, [commitPreferences]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== APP_PREFERENCES_STORAGE_KEY) return;
      commitPreferences(readStoredAppPreferences());
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [commitPreferences]);

  const updatePreferences = React.useCallback(
    (patch: Partial<AppPreferences>) => {
      commitPreferences({ ...preferencesRef.current, ...patch });
    },
    [commitPreferences],
  );

  const resetPreferences = React.useCallback(() => {
    commitPreferences({ ...DEFAULT_APP_PREFERENCES });
  }, [commitPreferences]);

  const value = React.useMemo(
    () => ({ preferences, updatePreferences, resetPreferences }),
    [preferences, updatePreferences, resetPreferences],
  );

  return (
    <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
  );
}

/** Unified provider: theme + app preferences (locale, timezone). */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppPreferencesScope>{children}</AppPreferencesScope>
    </ThemeProvider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const context = React.useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used within PreferencesProvider');
  }
  return context;
}
