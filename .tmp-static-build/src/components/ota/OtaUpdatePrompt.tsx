'use client';

import { Download, RefreshCw, ShieldCheck } from 'lucide-react';

import { useOtaUpdate } from '@/features/ota/hooks/use-ota-update';
import { useTranslation } from '@/lib/i18n';

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OtaUpdatePrompt() {
  const { pending, promptVisible, isRestarting, error, restartNow, remindLater } = useOtaUpdate();
  const { t } = useTranslation();

  if (!pending || !promptVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ota-update-title"
    >
      <div className="asol-card-elevated w-full max-w-md space-y-5 rounded-3xl border border-outline-variant p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <Download className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="ota-update-title" className="text-lg font-bold text-on-surface">
              {t('ota.prompt.title')}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {t('ota.prompt.description', { version: pending.version })}
            </p>
          </div>
        </div>

        <div className="asol-card-tonal rounded-2xl p-4 text-sm text-on-surface-variant">
          <div className="flex items-center justify-between gap-3">
            <span>{t('ota.prompt.size')}</span>
            <span className="font-semibold text-on-surface">{formatSize(pending.size)}</span>
          </div>
          {pending.notes && <p className="mt-3 border-t border-outline-variant pt-3">{pending.notes}</p>}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
            {t('ota.prompt.verified')}
          </div>
        </div>

        {error && <p className="rounded-xl bg-error-container p-3 text-sm text-on-error-container">{error}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={remindLater}
            disabled={isRestarting}
            className="asol-control rounded-xl border border-outline px-4 font-semibold text-on-surface disabled:opacity-60"
          >
            {t('ota.prompt.later')}
          </button>
          <button
            type="button"
            onClick={() => void restartNow()}
            disabled={isRestarting}
            className="asol-accent-cta asol-control inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRestarting ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isRestarting ? t('ota.prompt.restarting') : t('ota.prompt.restart')}
          </button>
        </div>

        <p className="text-center text-xs text-on-surface-variant">{t('ota.prompt.autoApply')}</p>
      </div>
    </div>
  );
}
