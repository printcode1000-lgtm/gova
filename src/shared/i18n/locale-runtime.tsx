'use client';

import * as React from 'react';

import type { Locale } from './types';

export interface LocaleRuntimeValue {
  locale: Locale;
  changeLanguage: (locale: Locale) => void;
}

const LocaleRuntimeContext = React.createContext<LocaleRuntimeValue | null>(null);

export function LocaleRuntimeProvider({
  locale,
  changeLanguage,
  children,
}: LocaleRuntimeValue & { children: React.ReactNode }) {
  const value = React.useMemo(
    () => ({ locale, changeLanguage }),
    [locale, changeLanguage],
  );
  return (
    <LocaleRuntimeContext.Provider value={value}>{children}</LocaleRuntimeContext.Provider>
  );
}

export function useLocaleRuntime(): LocaleRuntimeValue {
  const context = React.useContext(LocaleRuntimeContext);
  if (!context) {
    throw new Error('useLocaleRuntime must be used within LocaleRuntimeProvider');
  }
  return context;
}
