import { describe, expect, it } from '@jest/globals';

import { buildThemeInitScript } from '../build-theme-init-script';
import { normalizeThemePreferences } from '../storage';
import { resolveColorScheme } from '../resolve-theme';

describe('resolveColorScheme', () => {
  it('resolves explicit modes', () => {
    expect(resolveColorScheme('light')).toBe('light');
    expect(resolveColorScheme('dark')).toBe('dark');
  });
});

describe('normalizeThemePreferences', () => {
  it('clamps invalid font sizes', () => {
    expect(normalizeThemePreferences({ fontSize: 4 }).fontSize).toBe(12);
    expect(normalizeThemePreferences({ fontSize: 99 }).fontSize).toBe(24);
  });

  it('ignores unknown fields', () => {
    const normalized = normalizeThemePreferences({
      themeMode: 'dark',
    } as never);
    expect(normalized.themeMode).toBe('dark');
    expect('reducedMotion' in normalized).toBe(false);
    expect('timezone' in normalized).toBe(false);
  });

  it('falls back to light for invalid themeMode', () => {
    const normalized = normalizeThemePreferences({
      themeMode: 'system',
    } as never);
    expect(normalized.themeMode).toBe('light');
  });
});

describe('buildThemeInitScript', () => {
  it('sets light theme attributes and theme-color meta tag', () => {
    const script = buildThemeInitScript();
    expect(script).toContain("setAttribute('data-theme','light')");
    expect(script).toContain('theme-color');
  });
});
