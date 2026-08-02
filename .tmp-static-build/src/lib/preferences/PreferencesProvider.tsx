'use client';

import { ThemeProvider } from '@/theme/runtime';
import * as React from 'react';
import { applyDocumentLocale } from '@/lib/i18n/apply-locale';

import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from './app-preferences-types';
import {
  readAppPreferencesFromDb,
  writeAppPreferencesToDb,
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

  const commitPreferences = React.useCallback(async (next: AppPreferences) => {
    setPreferences(next);
    applyDocumentLocale(next.locale);
    await writeAppPreferencesToDb(next);
  }, []);

  React.useEffect(() => {
    async function init() {
      const stored = await readAppPreferencesFromDb();
      await commitPreferences(stored);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-app-hydrated', 'true');
      }
    }
    init();
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

/** Unified provider: theme + app preferences. */
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
