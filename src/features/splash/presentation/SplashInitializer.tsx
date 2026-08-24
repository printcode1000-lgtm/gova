'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/ui';
import { isSuperAdmin } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';
import { asolDbGet, ASOL_DB_STORES } from '@asol/data-core/browser';
import { runInitialization } from '@/features/splash/application/services/initialization';
import { otaUpdateService } from '@asol/ota-core';

import ProgressIndicator from './ProgressIndicator';
import { registerBrowserPorts } from "@/core/composition/browser-ports";

// Sealed packages name ports; the application supplies them. Registered at module load in
// every module that touches a package runtime, because there is no single client bootstrap
// they all pass through: the splash prepares an update long before the settings page mounts.
// The root is idempotent, so registering more than once is free. A contract test enforces it.
registerBrowserPorts();

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
