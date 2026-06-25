import type { ThemeMode } from './types';

export type ResolvedColorScheme = 'light' | 'dark';

export function readSystemColorScheme(): ResolvedColorScheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveColorScheme(
  themeMode: ThemeMode,
  systemScheme: ResolvedColorScheme = readSystemColorScheme(),
): ResolvedColorScheme {
  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';
  return systemScheme;
}
