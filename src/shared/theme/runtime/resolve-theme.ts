import type { ThemeMode } from './types';

export type ResolvedColorScheme = 'light' | 'dark';

export function resolveColorScheme(themeMode: ThemeMode): ResolvedColorScheme {
  return themeMode === 'dark' ? 'dark' : 'light';
}
