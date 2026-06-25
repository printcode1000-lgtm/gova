import { describe, expect, it } from '@jest/globals';

import { buildThemeInitScript } from '../build-theme-init-script';
import { normalizeThemePreferences } from '../storage';
import { resolveColorScheme } from '../resolve-theme';
import { resolveReducedMotion } from '../resolve-reduced-motion';
import { THEME_STORAGE_KEY } from '../types';

describe('resolveColorScheme', () => {
  it('resolves explicit modes', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
  });
});

describe('resolveReducedMotion', () => {
  it('handles tri-state preference', () => {
    expect(resolveReducedMotion('on', false)).toBe(true);
    expect(resolveReducedMotion('off', true)).toBe(false);
    expect(resolveReducedMotion('system', true)).toBe(true);
    expect(resolveReducedMotion('system', false)).toBe(false);
  });
});

describe('normalizeThemePreferences', () => {
  it('migrates legacy boolean reducedMotion', () => {
    expect(normalizeThemePreferences({ reducedMotion: true }).reducedMotion).toBe('on');
    expect(normalizeThemePreferences({ reducedMotion: false }).reducedMotion).toBe('off');
  });

  it('clamps invalid font sizes', () => {
    expect(normalizeThemePreferences({ fontSize: 4 }).fontSize).toBe(12);
    expect(normalizeThemePreferences({ fontSize: 99 }).fontSize).toBe(24);
  });

  it('ignores removed legacy fields', () => {
    const normalized = normalizeThemePreferences({
      themeMode: 'dark',
      localePreview: 'en',
      timezone: 'dubai',
    } as never);
    expect(normalized.themeMode).toBe('dark');
    expect('localePreview' in normalized).toBe(false);
  });
});

describe('buildThemeInitScript', () => {
  it('references storage key and explicit light/dark theme colors', () => {
    const script = buildThemeInitScript();
    expect(script).toContain(THEME_STORAGE_KEY);
    expect(script).toContain("setAttribute('data-theme',scheme)");
    expect(script).toContain('theme-color');
  });
});
