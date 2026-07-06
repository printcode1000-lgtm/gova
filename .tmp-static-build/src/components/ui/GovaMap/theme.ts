import type { GovaMapTheme, GovaMapThemeName } from './types';

export const defaultTheme: Required<Omit<GovaMapTheme, 'className'>> = { name: 'auto', markerColor: '#1a73e8', routeColor: '#1a73e8', polygonFill: '#34a853', circleFill: '#4285f4', clusterColor: '#1e8e3e' };

export function resolveTheme(name: GovaMapThemeName): 'light' | 'dark' {
  if (name !== 'auto') return name;
  if (typeof document !== 'undefined') {
    const value = document.documentElement.dataset.theme;
    if (value === 'dark' || value === 'light') return value;
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
