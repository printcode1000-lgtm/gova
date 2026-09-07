'use client';

import { CircleAlert, RefreshCw, ServerOff, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { BOTTOM_NAV_CLEARANCE } from '@/shared/layouts/bottom-nav-layout';
import { useNetworkStatus, type NetworkStatus } from '@/features/network/presentation/hooks/use-network-status';
import { useTranslation } from '@/shared/i18n';
import { getClientRuntimeContext } from '@/core/config/runtime-context.client';
import { publicEnv } from '@/core/config/public-env';
import { cn } from '@/shared/utils';
import {
  resolveNetworkDisplayEnvironment,
  restoredMessageKey,
  serverUnavailableMessageKey,
  type NetworkRestoredFrom,
} from './network-status-copy';

const DISCONNECTED_STATUSES: NetworkRestoredFrom[] = [
  'offline',
  'server-unreachable',
  'check-failed',
];

export function NetworkStatusBanner() {
  const { status, isChecking, checkConnection } = useNetworkStatus();
  const { t } = useTranslation();
  const previousStatus = useRef<NetworkStatus>('checking');
  const [restoredFrom, setRestoredFrom] = useState<NetworkRestoredFrom | null>(null);
  const environment = resolveNetworkDisplayEnvironment(
    getClientRuntimeContext(),
    publicEnv.developmentBuild,
  );

  useEffect(() => {
    const previous = previousStatus.current;
    const wasDisconnected = DISCONNECTED_STATUSES.includes(
      previous as NetworkRestoredFrom,
    );
    previousStatus.current = status;

    if (!wasDisconnected || status !== 'online') {
      if (status !== 'online') setRestoredFrom(null);
      return;
    }

    setRestoredFrom(previous as NetworkRestoredFrom);
    const timeout = window.setTimeout(() => setRestoredFrom(null), 3_000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const isDisconnected = DISCONNECTED_STATUSES.includes(
    status as NetworkRestoredFrom,
  );
  const showRestored = status === 'online' && restoredFrom !== null;
  if (!isDisconnected && !showRestored) return null;

  const isOffline = status === 'offline';
  const isCheckFailed = status === 'check-failed';
  const Icon = showRestored ? Wifi : isOffline ? WifiOff : isCheckFailed ? CircleAlert : ServerOff;
  const message = showRestored
    ? t(restoredMessageKey(restoredFrom, environment))
    : isOffline
      ? t('network.offline')
      : isCheckFailed
        ? t('network.checkFailed')
        : t(serverUnavailableMessageKey(environment));

  return (
    <div id='features-network-presentation-networkstatusbanner-div-1-fagcln'
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-3 z-[100] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur',
        showRestored
          ? 'border-success/30 bg-success-container text-on-success-container'
          : 'border-error/30 bg-error-container text-on-error-container',
      )}
      style={{ bottom: BOTTOM_NAV_CLEARANCE }}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p id='features-network-presentation-networkstatusbanner-text-2-7ezvno' className="min-w-0 flex-1 text-sm font-medium">{message}</p>
      {!showRestored && (
        <button id='features-network-presentation-networkstatusbanner-button-3-x2ydyj'
          type="button"
          onClick={() => void checkConnection()}
          disabled={isChecking}
          className="asol-control inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold disabled:opacity-60"
        >
          <RefreshCw id='features-network-presentation-networkstatusbanner-refreshcw-4-fw0cki' className={cn('h-4 w-4', isChecking && 'animate-spin')} aria-hidden="true" />
          {isChecking ? t('network.checking') : t('network.retry')}
        </button>
      )}
    </div>
  );
}
