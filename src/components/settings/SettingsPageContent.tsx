'use client';

import { Accessibility, Database, FileText, Globe, Palette } from 'lucide-react';
import * as React from 'react';
import {
  useAppPreferences,
  useThemePreferences,
} from '@/lib/preferences';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  CLEAR_STORAGE_WARNING,
  calculateLocalStorageSize,
  clearAllClientStorage,
  formatBytes,
} from '@/lib/storage/client-storage';

import {
  type SettingsDensity,
  type SettingsLocale,
  type SettingsReducedMotion,
  type SettingsThemeMode,
  type SettingsTimezone,
} from './settings-types';

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="h-8 w-14 shrink-0 rounded-full p-0"
      onClick={() => onChange(!checked)}
    >
      <div
        className={cn(
          'h-full w-full rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-variant',
        )}
      />
    </button>
  );
}

export function SettingsPageContent() {
  const { t } = useTranslation();
  const {
    preferences: themePrefs,
    resolvedScheme,
    updatePreferences: updateTheme,
    resetPreferences: resetTheme,
  } = useThemePreferences();
  const {
    preferences: appPrefs,
    updatePreferences: updateApp,
    resetPreferences: resetApp,
  } = useAppPreferences();

  const [storageSize, setStorageSize] = React.useState(0);
  const [statusText, setStatusText] = React.useState('');
  const [clearing, setClearing] = React.useState(false);

  const timezoneLabels: Record<SettingsTimezone, string> = {
    cairo: t('timezone.cairo'),
    mecca: t('timezone.mecca'),
    dubai: t('timezone.dubai'),
  };

  const themeLabels: Record<SettingsThemeMode, string> = {
    light: t('theme.light'),
    dark: t('theme.dark'),
    system: t('theme.system'),
  };

  const densityLabels: Record<SettingsDensity, string> = {
    compact: t('density.compact'),
    comfortable: t('density.comfortable'),
    spacious: t('density.spacious'),
  };

  const motionLabels: Record<SettingsReducedMotion, string> = {
    system: t('motion.system'),
    on: t('motion.on'),
    off: t('motion.off'),
  };

  React.useEffect(() => {
    setStorageSize(calculateLocalStorageSize());
  }, []);

  const showStatus = (message: string) => {
    setStatusText(message);
    window.setTimeout(() => setStatusText(''), 3000);
  };

  const handleClearAll = async () => {
    if (!window.confirm(CLEAR_STORAGE_WARNING)) return;

    setClearing(true);
    try {
      await clearAllClientStorage();
      setStorageSize(0);
      window.location.reload();
    } catch {
      showStatus(t('settings.clearError'));
      setClearing(false);
    }
  };

  const storageUsagePercent = Math.min((storageSize / 5_242_880) * 100, 100);
  const activeThemeLabel =
    themePrefs.themeMode === 'system'
      ? `${themeLabels.system} (${resolvedScheme === 'dark' ? t('theme.dark') : t('theme.light')})`
      : themeLabels[themePrefs.themeMode];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
      <header className="mb-12 space-y-2 text-center">
        <h1 className="text-3xl font-bold text-primary">{t('settings.title')}</h1>
        <p className="text-base text-on-surface-variant">
          {t('settings.description')}
        </p>
        <p className="text-xs text-on-surface-variant" aria-live="polite">
          {t('settings.saveAuto')}
        </p>
        {statusText ? (
          <p className="text-sm font-medium text-primary" role="status">
            {statusText}
          </p>
        ) : null}
      </header>

      {/* Language & Region */}
      <section
        className="mb-12 space-y-6"
        lang={appPrefs.locale}
      >
        <div className="flex items-center gap-3 px-2">
          <Globe className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-on-surface">{t('settings.langRegion')}</h2>
        </div>
        <div className="gova-settings-section-secondary space-y-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{t('settings.chooseLang')}</h3>
              <p className="text-sm text-on-surface-variant">
                {t('settings.chooseLangDesc')}
              </p>
            </div>
            <div className="flex w-fit gap-1 rounded-full bg-surface-variant p-1">
              {(['ar', 'en'] as SettingsLocale[]).map((locale) => (
                <button
                  key={locale}
                  type="button"
                  className={cn(
                    'gova-control rounded-full px-6 text-xs font-semibold transition-colors',
                    appPrefs.locale === locale
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                  onClick={() => updateApp({ locale })}
                >
                  {locale === 'ar' ? t('common.arabic') : t('common.english')}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 border-t border-outline-variant/20 pt-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-outline">{t('settings.directionPreview')}</h4>
              <div className="flex items-center gap-4 rounded-xl gova-surface-neutral p-4">
                <div className="flex gova-control-icon items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="text-sm">
                  {appPrefs.locale === 'ar'
                    ? t('settings.rtl')
                    : t('settings.ltr')}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-outline">{t('settings.timezone')}</h4>
              <select
                className="gova-control w-full border border-outline-variant gova-field-surface text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                value={appPrefs.timezone}
                onChange={(e) => updateApp({ timezone: e.target.value as SettingsTimezone })}
              >
                {(Object.keys(timezoneLabels) as SettingsTimezone[]).map((key) => (
                  <option key={key} value={key}>
                    {timezoneLabels[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="mb-12 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Palette className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-on-surface">{t('settings.appearance')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="gova-settings-section-primary space-y-6">
              <h3 className="text-lg font-semibold">{t('settings.visualTheme')}</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['light', 'dark', 'system'] as SettingsThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-2xl p-4 transition-colors',
                      themePrefs.themeMode === mode
                        ? 'bg-primary/15 ring-2 ring-primary'
                        : 'gova-surface-neutral hover:opacity-90',
                    )}
                    onClick={() => updateTheme({ themeMode: mode })}
                  >
                    <Palette className="h-8 w-8" />
                    <span className="text-xs font-semibold">{themeLabels[mode]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="gova-settings-section-neutral space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t('settings.fontSize')}</h3>
                  <span className="rounded-lg bg-surface-variant px-3 py-1 text-xs font-semibold">
                    {themePrefs.fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={24}
                  value={themePrefs.fontSize}
                  onChange={(e) => updateTheme({ fontSize: Number(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-variant accent-primary"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('settings.uiDensity')}</h3>
                <div className="flex gap-4">
                  {(['compact', 'comfortable', 'spacious'] as SettingsDensity[]).map((density) => (
                    <button
                      key={density}
                      type="button"
                      className={cn(
                        'gova-control flex-1 text-xs font-semibold transition-colors',
                        themePrefs.density === density
                          ? 'bg-primary text-on-primary'
                          : 'gova-surface-neutral text-on-surface-variant hover:text-on-surface',
                      )}
                      onClick={() => updateTheme({ density })}
                    >
                      {densityLabels[density]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="gova-settings-preview-accent relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <h3 className="text-lg font-semibold">{t('settings.livePreview')}</h3>
              <div className="space-y-3 opacity-90">
                <div className="h-4 w-3/4 rounded bg-on-primary/20" />
                <div className="h-4 w-full rounded bg-on-primary/20" />
                <div className="h-4 w-1/2 rounded bg-on-primary/20" />
              </div>
              <div className="pt-4">
                <button type="button" className="gova-control w-full gova-surface-neutral font-bold text-primary">
                  {t('settings.demoButton')}
                </button>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-on-primary/10 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Accessibility */}
      <section className="mb-12 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Accessibility className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-on-surface">{t('settings.accessibility')}</h2>
        </div>
        <div className="gova-settings-section-tertiary divide-y divide-outline-variant/20 !shadow-none">
          <div className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{t('settings.highContrast')}</h3>
              <p className="text-sm text-on-surface-variant">
                {t('settings.highContrastDesc')}
              </p>
            </div>
            <ToggleSwitch
              checked={themePrefs.highContrast}
              onChange={(highContrast) => updateTheme({ highContrast })}
              label={t('settings.highContrast')}
            />
          </div>
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{t('settings.reducedMotion')}</h3>
              <p className="text-sm text-on-surface-variant">
                {t('settings.reducedMotionDesc')}
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {(['system', 'on', 'off'] as SettingsReducedMotion[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    'gova-control flex-1 text-xs font-semibold sm:flex-none',
                    themePrefs.reducedMotion === mode
                      ? 'bg-primary text-on-primary'
                      : 'gova-surface-neutral text-on-surface-variant',
                  )}
                  onClick={() => updateTheme({ reducedMotion: mode })}
                >
                  {motionLabels[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="mb-12 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-on-surface">{t('settings.storage')}</h2>
        </div>
        <div className="gova-settings-section-error">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('settings.localStorage')}</span>
                <span className="text-xs font-semibold text-primary">{formatBytes(storageSize)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-variant">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${storageUsagePercent}%` }}
                />
              </div>
            </div>
            <div className="flex flex-1 items-center justify-between rounded-xl gova-surface-neutral p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-outline" />
                <span className="text-sm">{t('settings.cookiesLocalData')}</span>
              </div>
              <button
                type="button"
                disabled={clearing}
                onClick={() => void handleClearAll()}
                className="gova-control border border-error/40 bg-error/10 text-xs font-semibold text-error hover:bg-error/20 disabled:opacity-60"
              >
                {clearing ? t('settings.clearing') : t('settings.clearAll')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="mb-12 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-on-surface">{t('settings.summary')}</h2>
        </div>
        <div className="gova-card-neutral p-6">
          <ul className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
            <SummaryRow
              label={t('settings.languageLabel')}
              value={appPrefs.locale === 'ar' ? t('common.arabic') : t('common.english')}
            />
            <SummaryRow label={t('settings.visualTheme')} value={activeThemeLabel} />
            <SummaryRow label={t('settings.uiDensity')} value={densityLabels[themePrefs.density]} />
            <SummaryRow label={t('settings.timezone')} value={timezoneLabels[appPrefs.timezone]} />
            <SummaryRow
              label={t('settings.reducedMotion')}
              value={motionLabels[themePrefs.reducedMotion]}
            />
            <SummaryRow label={t('settings.fontSize')} value={`${themePrefs.fontSize}px`} />
          </ul>
        </div>
      </section>

      {/* Footer actions */}
      <footer className="flex flex-col items-center justify-center gap-4 pt-12 md:flex-row-reverse">
        <button
          type="button"
          className="gova-control w-full rounded-full border-2 border-outline font-semibold md:w-auto"
          onClick={() => {
            resetTheme();
            resetApp();
            showStatus(t('settings.resetSuccess'));
          }}
        >
          {t('settings.reset')}
        </button>
        <button
          type="button"
          disabled={clearing}
          className="gova-control w-full rounded-full font-semibold text-error hover:bg-error/5 md:w-auto disabled:opacity-60"
          onClick={() => void handleClearAll()}
        >
          {clearing ? t('settings.clearing') : t('settings.restoreDefaults')}
        </button>
      </footer>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between border-b border-outline-variant/10 py-2">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm font-bold text-primary">{value}</span>
    </li>
  );
}
