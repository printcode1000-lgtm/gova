'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { runInitialization } from '@/lib/initialization/initialization';

import ProgressIndicator from './ProgressIndicator';

export default function SplashInitializer() {
  const router = useRouter();
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const isCompleteRef = useRef(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await runInitialization(({ progress, statusKey }) => {
          setProgress(progress);
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
      router.replace('/home');
    }
  }, [progress, router]);

  return <ProgressIndicator progress={progress} status={status} />;
}
