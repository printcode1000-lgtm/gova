'use client';

import { RefreshCw, ServerOff, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useNetworkStatus, type NetworkStatus } from '@/features/network/hooks/use-network-status';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const DISCONNECTED_STATUSES: NetworkStatus[] = ['offline', 'server-unreachable'];

export function NetworkStatusBanner() {
  const { status, isChecking, checkConnection } = useNetworkStatus();
  const { t } = useTranslation();
  const previousStatus = useRef<NetworkStatus>('checking');
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const wasDisconnected = DISCONNECTED_STATUSES.includes(previousStatus.current);
    previousStatus.current = status;

    if (!wasDisconnected || status !== 'online') return;

    setShowRestored(true);
    const timeout = window.setTimeout(() => setShowRestored(false), 3_000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const isDisconnected = DISCONNECTED_STATUSES.includes(status);
  if (!isDisconnected && !showRestored) return null;

  const isOffline = status === 'offline';
  const Icon = showRestored ? Wifi : isOffline ? WifiOff : ServerOff;
  const message = showRestored
    ? t('network.restored')
    : isOffline
      ? t('network.offline')
      : t('network.serverUnavailable');

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-3 bottom-20 z-[100] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur md:bottom-4',
        showRestored
          ? 'border-success/30 bg-success-container text-on-success-container'
          : 'border-error/30 bg-error-container text-on-error-container',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm font-medium">{message}</p>
      {!showRestored && (
        <button
          type="button"
          onClick={() => void checkConnection()}
          disabled={isChecking}
          className="gova-control inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', isChecking && 'animate-spin')} aria-hidden="true" />
          {isChecking ? t('network.checking') : t('network.retry')}
        </button>
      )}
    </div>
  );
}
