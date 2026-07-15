'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

interface ProgressIndicatorProps {
  progress: number;
  status: string;
  details?: readonly string[];
}

const PROGRESS_MESSAGE_KEYS = [
  'splash.progress.message1',
  'splash.progress.message2',
  'splash.progress.message3',
  'splash.progress.message4',
  'splash.progress.message5',
] as const satisfies readonly TranslationKey[];

export default function ProgressIndicator({ progress, status, details = [] }: ProgressIndicatorProps) {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % PROGRESS_MESSAGE_KEYS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-xs flex flex-col items-center z-10 px-4">
      <div className="h-8 text-xs font-semibold text-on-surface-variant text-center px-4 transition-all duration-500 ease-in-out">
        {status || t(PROGRESS_MESSAGE_KEYS[msgIndex])}
      </div>

      {details.length > 0 && (
        <div className="mt-2 grid w-full gap-1 rounded-xl border border-outline-variant/70 bg-surface-container/70 px-3 py-2 text-center text-[11px] font-semibold text-on-surface-variant">
          {details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      )}

      <div className="w-full mt-4 asol-splash-progress-track h-1 rounded-full overflow-hidden relative shadow-inner">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out shadow-lg"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-xs font-semibold text-on-surface-variant">{t('splash.progress.loading')}</span>
        <span className="text-xs font-semibold text-primary">{progress}%</span>
      </div>
    </div>
  );
}
