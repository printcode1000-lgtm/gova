'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { runInitialization } from '@/lib/initialization/initialization';
import { otaUpdateService } from '@/features/ota/services/ota-update-service';

import ProgressIndicator from './ProgressIndicator';

const SPLASH_NAV_TOGGLE_KEY = 'gova-dev-splash-nav-toggle';

export default function SplashInitializer() {
  const router = useRouter();
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const isCompleteRef = useRef(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const otaEnabled = otaUpdateService.isEnabled();
        if (otaEnabled) {
          await otaUpdateService.prepareAtSplash(({ progress, statusKey }) => {
            setProgress(progress);
            setStatus(t(statusKey));
          });
        }

        await runInitialization(({ progress, statusKey }) => {
          setProgress(otaEnabled ? 70 + Math.round(progress * 0.3) : progress);
          setStatus(t(statusKey));
        });

        isCompleteRef.current = true;
      } catch (error) {
        console.error('Initialization failed:', error);
      }
    };

    void initialize();
  }, [t]);

  useEffect(() => {
    if (isCompleteRef.current && progress === 100) {
      const isNavEnabled = localStorage.getItem(SPLASH_NAV_TOGGLE_KEY) !== 'false';
      if (isNavEnabled) {
        router.replace('/home');
      }
    }
  }, [progress, router]);

  return <ProgressIndicator progress={progress} status={status} />;
}
