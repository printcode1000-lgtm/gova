'use client';

import { useEffect, useState } from 'react';

import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';

interface ProgressIndicatorProps {
  progress: number;
  status: string;
  details?: readonly string[];
  canViewDetails?: boolean;
}

const PROGRESS_MESSAGE_KEYS = [
  'splash.progress.message1',
  'splash.progress.message2',
  'splash.progress.message3',
  'splash.progress.message4',
  'splash.progress.message5',
] as const satisfies readonly TranslationKey[];

export default function ProgressIndicator({
  progress,
  status,
  details = [],
  canViewDetails = false,
}: ProgressIndicatorProps) {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % PROGRESS_MESSAGE_KEYS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="splash.progress-indicator.div" className="w-full max-w-xs flex flex-col items-center z-10 px-4">
      <div id="splash.progress-indicator.div.2" className="h-8 text-xs font-semibold text-on-surface-variant text-center px-4 transition-all duration-500 ease-in-out">
        {status || t(PROGRESS_MESSAGE_KEYS[msgIndex])}
      </div>

      {details.length > 0 &&
        (canViewDetails ? (
          <div id="splash.progress-indicator.div.3" className="mt-2 grid w-full gap-1 rounded-xl border border-outline-variant/70 bg-surface-container/70 px-3 py-2 text-center text-[11px] font-semibold text-on-surface-variant">
            {details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        ) : (
          <LoadingSpinner id="splash.progress-indicator.loading-spinner" size="md" className="mt-2" role="status" aria-label={t('splash.progress.loading')} />
        ))}

      <div id="splash.progress-indicator.div.4" className="w-full mt-4 asol-splash-progress-track h-1 rounded-full overflow-hidden relative shadow-inner">
        <div id="splash.progress-indicator.div.5"
          className="h-full bg-primary transition-all duration-300 ease-out shadow-lg"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div id="splash.progress-indicator.div.6" className="flex items-center gap-1.5 mt-2">
        <span id="splash.progress-indicator.span" className="text-xs font-semibold text-on-surface-variant">{t('splash.progress.loading')}</span>
        <span id="splash.progress-indicator.span.2" className="text-xs font-semibold text-primary">{progress}%</span>
      </div>
    </div>
  );
}
