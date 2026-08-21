import * as React from 'react';

import type { ResolvedColorScheme } from './resolve-theme';
import type { ThemePreferences } from './types';

export type ThemeContextValue = {
  preferences: ThemePreferences;
  resolvedScheme: ResolvedColorScheme;
  updatePreferences: (patch: Partial<ThemePreferences>) => void;
  resetPreferences: () => void;
  replacePreferences: (next: ThemePreferences) => void;
  toggleColorScheme: () => void;
  cycleThemeMode: () => void;
};

export const ThemeContext = React.createContext<ThemeContextValue | null>(null);
