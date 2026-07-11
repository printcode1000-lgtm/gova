'use client';

import { Bell, Database, FileText, Globe, Palette } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdjust, faSun, faMoon, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import {
  useAppPreferences,
  useThemePreferences,
} from '@/lib/preferences';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  CLEAR_STORAGE_WARNING,
  clearAllClientStorage,
} from '@/lib/storage/client-storage';
import { useSession } from '@/features/auth/components/SessionProvider';
import { webPushBrowserService } from '@/features/notifications/application/web-push-browser-service';

import {
  type SettingsDensity,
  type SettingsLocale,
  type SettingsThemeMode,
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
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="h-8 w-14 shrink-0 rounded-full accent-primary cursor-pointer"
    />
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
  const { session } = useSession();

  const [statusText, setStatusText] = React.useState('');
  const [webPushStatus, setWebPushStatus] = React.useState('');
  const [webPushBusy, setWebPushBusy] = React.useState(false);
  const [webPushPermission, setWebPushPermission] = React.useState<NotificationPermission | 'unsupported'>('unsupported');
  const [clearing, setClearing] = React.useState(false);
  const [tempFontSize, setTempFontSize] = React.useState(themePrefs.fontSize);
  const [showClearDialog, setShowClearDialog] = React.useState(false);

  const themeLabels: Record<SettingsThemeMode, string> = {
    light: t('theme.light'),
    dark: t('theme.dark'),
  };

  const densityLabels: Record<SettingsDensity, string> = {
    compact: t('density.compact'),
    comfortable: t('density.comfortable'),
    spacious: t('density.spacious'),
  };

  React.useEffect(() => {
    setTempFontSize(themePrefs.fontSize);
  }, [themePrefs.fontSize]);

  React.useEffect(() => {
    setWebPushPermission(webPushBrowserService.getPermission());
  }, []);

  const showStatus = (message: string) => {
    setStatusText(message);
    window.setTimeout(() => setStatusText(''), 3000);
  };

  const cycleThemeMode = () => {
    const modes: SettingsThemeMode[] = ['light', 'dark'];
    const currentIndex = modes.indexOf(themePrefs.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    updateTheme({ themeMode: modes[nextIndex] });
  };

  const getThemeIcon = () => {
    switch (themePrefs.themeMode) {
      case 'light':
        return faSun;
      case 'dark':
        return faMoon;
      default:
        return faSun;
    }
  };

  const handleClearAll = async () => {
    setShowClearDialog(true);
  };

  const confirmClearAll = async () => {
    setShowClearDialog(false);
    setClearing(true);
    try {
      await clearAllClientStorage();
      window.location.reload();
    } catch {
      showStatus(t('settings.clearError'));
      setClearing(false);
    }
  };

  const activeThemeLabel = themeLabels[themePrefs.themeMode];

  const enableWebPush = async () => {
    if (!session?.uid) {
      setWebPushStatus('يجب تسجيل الدخول لتفعيل إشعارات هذا الجهاز.');
      return;
    }
    setWebPushBusy(true);
    setWebPushStatus('');
    try {
      await webPushBrowserService.subscribe(session.uid);
      setWebPushPermission(webPushBrowserService.getPermission());
      setWebPushStatus('تم تفعيل إشعارات المتصفح لهذا الجهاز.');
    } catch (error) {
      setWebPushStatus(error instanceof Error ? error.message : 'تعذر تفعيل إشعارات المتصفح.');
    } finally {
      setWebPushBusy(false);
    }
  };

  const disableWebPush = async () => {
    if (!session?.uid) return;
    setWebPushBusy(true);
    setWebPushStatus('');
    try {
      await webPushBrowserService.unsubscribe(session.uid);
      setWebPushPermission(webPushBrowserService.getPermission());
      setWebPushStatus('تم إلغاء اشتراك هذا الجهاز.');
    } catch (error) {
      setWebPushStatus(error instanceof Error ? error.message : 'تعذر إلغاء إشعارات هذا الجهاز.');
    } finally {
      setWebPushBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
      <header className="mb-12 space-y-2 text-center">
        <h1 className="text-3xl font-bold text-primary">{t('settings.title')}</h1>
        <p className="text-base text-on-surface-variant">
          {t('settings.description')}
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
        <div className="gova-settings-section-secondary space-y-8">
          <div className="flex items-center gap-3 px-2">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">{t('settings.languageLabel')}</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
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
            <div className="flex items-center gap-3 w-full sm:flex-1">
              <h3 className="text-sm font-semibold whitespace-nowrap">{t('settings.fontSize')}</h3>
              <span className="rounded-lg bg-surface-variant px-2 py-1 text-xs font-semibold whitespace-nowrap">
                {tempFontSize}px
              </span>
              <input
                type="range"
                min={12}
                max={24}
                value={tempFontSize}
                onChange={(e) => setTempFontSize(Number(e.target.value))}
                onMouseUp={() => updateTheme({ fontSize: tempFontSize })}
                onMouseLeave={() => updateTheme({ fontSize: tempFontSize })}
                onTouchEnd={() => updateTheme({ fontSize: tempFontSize })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-variant accent-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="mb-12 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="gova-settings-section-primary space-y-6">
              <div className="flex items-center gap-3 px-2">
                <Palette className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-on-surface">{t('settings.appearance')}</h2>
              </div>
              <div className="flex flex-row items-center justify-center gap-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={cycleThemeMode}
                    className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 transition-all hover:bg-primary/30"
                    aria-label={t('settings.visualTheme')}
                  >
                    <FontAwesomeIcon icon={getThemeIcon()} className="h-7 w-7 text-primary" />
                  </button>
                  <div className="text-center">
                    <h4 className="text-sm font-semibold">{activeThemeLabel}</h4>
                  </div>
                </div>
                <div className="h-12 w-px bg-outline-variant/30" />
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateTheme({ highContrast: !themePrefs.highContrast })}
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-xl transition-all',
                      themePrefs.highContrast
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80',
                    )}
                    aria-label={t('settings.highContrast')}
                  >
                    <FontAwesomeIcon icon={faAdjust} className="h-7 w-7" />
                  </button>
                  <div className="text-center">
                    <h4 className="text-sm font-semibold">{t('settings.highContrast')}</h4>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                <h3 className="text-lg font-semibold">{t('settings.uiDensity')}</h3>
                <div className="flex flex-wrap gap-3">
                  {(['compact', 'comfortable', 'spacious'] as SettingsDensity[]).map((density) => (
                    <label key={density} className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 transition-all hover:bg-white/10">
                      <input
                        type="radio"
                        name="density"
                        value={density}
                        checked={themePrefs.density === density}
                        onChange={() => updateTheme({ density })}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                      <span className="text-sm">{densityLabels[density]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12 space-y-6">
        <div className="gova-settings-section-secondary space-y-5">
          <div className="flex items-center gap-3 px-2">
            <Bell className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">إشعارات المتصفح</h2>
          </div>
          <div className="rounded-xl gova-surface-neutral p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-on-surface">حالة هذا الجهاز</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  الإذن الحالي: {webPushPermission === 'granted'
                    ? 'مسموح'
                    : webPushPermission === 'denied'
                      ? 'مرفوض من المتصفح'
                      : webPushPermission === 'default'
                        ? 'لم يتم السؤال بعد'
                        : 'غير مدعوم'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={webPushBusy || !webPushBrowserService.isSupported()}
                  onClick={() => void enableWebPush()}
                  className="gova-control rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
                >
                  تفعيل إشعارات المتصفح
                </button>
                <button
                  type="button"
                  disabled={webPushBusy || !session?.uid}
                  onClick={() => void disableWebPush()}
                  className="gova-control rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-60"
                >
                  إلغاء اشتراك هذا الجهاز
                </button>
              </div>
            </div>
            {webPushStatus ? (
              <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
                {webPushStatus}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="mb-12 space-y-6">
        <div className="gova-settings-section-error">
          <div className="flex items-center gap-3 px-2 mb-6">
            <Database className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">{t('settings.storage')}</h2>
          </div>
          <div className="flex items-center justify-between rounded-xl gova-surface-neutral p-4">
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
      </section>

      {/* Summary */}
      <section className="mb-12 space-y-6">
        <div className="gova-card-neutral p-6">
          <div className="flex items-center gap-3 px-2 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">{t('settings.summary')}</h2>
          </div>
          <ul className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
            <SummaryRow
              label={t('settings.languageLabel')}
              value={appPrefs.locale === 'ar' ? t('common.arabic') : t('common.english')}
            />
            <SummaryRow label={t('settings.visualTheme')} value={activeThemeLabel} />
            <SummaryRow label={t('settings.uiDensity')} value={densityLabels[themePrefs.density]} />
            <SummaryRow label={t('settings.fontSize')} value={`${themePrefs.fontSize}px`} />
          </ul>
        </div>
      </section>

      {/* Footer actions */}
      <footer className="flex flex-col items-center justify-center gap-4 pt-12 md:flex-row-reverse">
        <button
          type="button"
          disabled={clearing}
          className="gova-control flex w-full items-center justify-center gap-2 rounded-xl border-2 border-error/30 bg-gradient-to-r from-error/10 to-error/5 px-6 py-3 font-semibold text-error shadow-lg shadow-error/10 transition-all hover:border-error/50 hover:shadow-error/20 md:w-auto disabled:opacity-60"
          onClick={handleClearAll}
        >
          <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
          {clearing ? t('settings.clearing') : t('settings.restoreDefaults')}
        </button>
      </footer>

      {/* Clear Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/20">
                <FontAwesomeIcon icon={faRotateLeft} className="h-6 w-6 text-error" />
              </div>
              <h3 className="text-xl font-semibold text-on-surface">{t('settings.restoreDefaults')}</h3>
            </div>
            <p className="mb-6 text-sm text-on-surface-variant">{CLEAR_STORAGE_WARNING}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearDialog(false)}
                className="gova-control flex-1 rounded-xl px-4 py-2 font-semibold text-on-surface-variant hover:bg-surface-variant"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="gova-control flex-1 rounded-xl bg-error px-4 py-2 font-semibold text-on-primary hover:bg-error/90"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
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
