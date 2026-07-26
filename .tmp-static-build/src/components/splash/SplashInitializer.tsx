'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/components/SessionProvider';
import { isSuperAdmin } from '@/features/auth/utils/super-admin';
import { useTranslation } from '@/lib/i18n';
import { asolDbGet, ASOL_DB_STORES } from '@/lib/asol-db';
import { runInitialization } from '@/lib/initialization/initialization';
import { otaUpdateService } from '@/features/ota/services/ota-update-service';
import type { OtaDownloadProgress } from '@/features/ota/types/ota.types';

import ProgressIndicator from './ProgressIndicator';

const SPLASH_NAV_TOGGLE_KEY = 'asol-dev-splash-nav-toggle';

function formatBytes(bytes?: number): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildOtaDetails(update: OtaDownloadProgress): string[] {
  const details: string[] = [];
  if (update.currentVersion || update.remoteVersion) {
    details.push(`Current: ${update.currentVersion ?? '-'} | R2: ${update.remoteVersion ?? '-'}`);
  }
  if (typeof update.changedFileCount === 'number' || typeof update.deletedFileCount === 'number') {
    details.push(
      `Changed: ${update.changedFileCount ?? 0} | Deleted: ${update.deletedFileCount ?? 0}`,
    );
  }
  const size = formatBytes(update.downloadBytes);
  if (size) details.push(`Download: ${size}`);
  if (update.detail) details.push(update.detail);
  return details.slice(0, 4);
}

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
        if (otaEnabled) {
          await otaUpdateService.prepareAtSplash(
            (update) => {
              const { progress, statusKey } = update;
              setProgress(progress);
              setStatus(t(statusKey));
              setDetails(buildOtaDetails(update));
            },
            session ?? undefined,
          );
        }

        await runInitialization(({ progress, statusKey }) => {
          setProgress(otaEnabled ? 70 + Math.round(progress * 0.3) : progress);
          setStatus(t(statusKey));
          if (!otaEnabled) setDetails([]);
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
