'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/components/SessionProvider';
import { isSuperAdmin } from '@/features/auth/utils/super-admin';
import { useTranslation } from '@/lib/i18n';
import { asolDbGet, ASOL_DB_STORES } from '@/modules/data-access/browser/asol-db';
import { runInitialization } from '@/lib/initialization/initialization';
import { otaUpdateService } from '@/features/ota/services/ota-update-service';

import ProgressIndicator from './ProgressIndicator';

const SPLASH_NAV_TOGGLE_KEY = 'asol-dev-splash-nav-toggle';

export default function SplashInitializer() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session, isLoading: isSessionLoading } = useSession();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isSessionLoading) return;

    const initialize = async () => {
      try {
        const otaEnabled = otaUpdateService.isEnabled();
        if (otaEnabled) await otaUpdateService.prepareAtSplash(session ?? undefined);

        await runInitialization(({ progress, statusKey }) => {
          setProgress(progress);
          setStatus(t(statusKey));
          setDetails([]);
        });

        if (otaEnabled) await otaUpdateService.confirmRunningBundle();

        setIsComplete(true);
      } catch (error) {
        console.error('Initialization failed:', error);
      }
    };

    void initialize();
  }, [isSessionLoading, session, t]);

  useEffect(() => {
    if (isComplete && progress === 100) {
      const checkNav = async () => {
        const stored = await asolDbGet<boolean>(ASOL_DB_STORES.APP_SETTINGS, SPLASH_NAV_TOGGLE_KEY);
        const isNavEnabled = stored !== false;
        if (isNavEnabled) {
          router.replace('/home');
        }
      };
      void checkNav();
    }
  }, [isComplete, progress, router]);

  return (
    <ProgressIndicator
      progress={progress}
      status={status}
      details={details}
      canViewDetails={!isSessionLoading && isSuperAdmin(session)}
    />
  );
}
