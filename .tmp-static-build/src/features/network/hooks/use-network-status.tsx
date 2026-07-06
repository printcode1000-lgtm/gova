'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { networkApiService } from '../services/network-api-service';

export type NetworkStatus = 'checking' | 'online' | 'offline' | 'server-unreachable';

interface NetworkStatusValue {
  status: NetworkStatus;
  isOnline: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<void>;
}

const NetworkStatusContext = createContext<NetworkStatusValue | null>(null);
const HEALTH_CHECK_INTERVAL_MS = 30_000;

function browserIsOffline(): boolean {
  return navigator.onLine === false;
}

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>('checking');
  const [isChecking, setIsChecking] = useState(true);
  const activeCheck = useRef<AbortController | null>(null);
  const checkSequence = useRef(0);

  const checkConnection = useCallback(async () => {
    const sequence = ++checkSequence.current;
    activeCheck.current?.abort();

    if (browserIsOffline()) {
      setStatus('offline');
      setIsChecking(false);
      return;
    }

    const controller = new AbortController();
    activeCheck.current = controller;
    setIsChecking(true);

    try {
      const healthy = await networkApiService.checkHealth(controller.signal);
      if (sequence === checkSequence.current) {
        setStatus(healthy ? 'online' : 'server-unreachable');
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (sequence === checkSequence.current) {
        setStatus(browserIsOffline() ? 'offline' : 'server-unreachable');
      }
    } finally {
      if (sequence === checkSequence.current) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      checkSequence.current += 1;
      activeCheck.current?.abort();
      setStatus('offline');
      setIsChecking(false);
    };
    const handleOnline = () => void checkConnection();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkConnection();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    void checkConnection();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void checkConnection();
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      checkSequence.current += 1;
      activeCheck.current?.abort();
      window.clearInterval(interval);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkConnection]);

  const value = useMemo<NetworkStatusValue>(
    () => ({
      status,
      isOnline: status === 'online',
      isChecking,
      checkConnection,
    }),
    [status, isChecking, checkConnection],
  );

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>;
}

export function useNetworkStatus(): NetworkStatusValue {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider');
  }
  return context;
}
