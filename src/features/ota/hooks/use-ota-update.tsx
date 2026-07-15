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

import { OTA_STATE_EVENT, otaUpdateService } from '../services/ota-update-service';
import type { DownloadedOtaUpdate, OtaStoredState } from '../types/ota.types';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface OtaUpdateContextValue {
  pending: DownloadedOtaUpdate | null;
  promptVisible: boolean;
  isRestarting: boolean;
  error: string | null;
  restartNow: () => Promise<void>;
  remindLater: () => void;
}

const OtaUpdateContext = createContext<OtaUpdateContextValue | null>(null);

function shouldPrompt(update: DownloadedOtaUpdate | null): boolean {
  if (!update) return false;
  return !update.dismissedAt || Date.now() - update.dismissedAt >= REMINDER_INTERVAL_MS;
}

export function OtaUpdateProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<DownloadedOtaUpdate | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminderTimer = useRef<number | null>(null);

  const scheduleReminder = useCallback((update: DownloadedOtaUpdate | null) => {
    if (reminderTimer.current !== null) window.clearTimeout(reminderTimer.current);
    reminderTimer.current = null;
    if (!update?.dismissedAt) return;

    const remaining = REMINDER_INTERVAL_MS - (Date.now() - update.dismissedAt);
    if (remaining <= 0) {
      setPromptVisible(true);
      return;
    }
    reminderTimer.current = window.setTimeout(() => setPromptVisible(true), remaining);
  }, []);

  const syncState = useCallback(async (state?: OtaStoredState) => {
    const update = state ? (state.pending ?? null) : await otaUpdateService.getPending();
    setPending(update);
    setPromptVisible(shouldPrompt(update));
    scheduleReminder(update);
  }, [scheduleReminder]);

  const checkForUpdates = useCallback(async () => {
    if (!otaUpdateService.isEnabled() || await otaUpdateService.getPending()) return;
    try {
      await otaUpdateService.checkAndDownload();
    } catch (checkError) {
      console.warn(
        '[AsolOTA] Background update check skipped:',
        checkError instanceof Error ? checkError.message : checkError,
      );
    }
  }, []);

  useEffect(() => {
    const handleState = (event: Event) => {
      syncState((event as CustomEvent<OtaStoredState>).detail);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    };

    window.addEventListener(OTA_STATE_EVENT, handleState);
    document.addEventListener('visibilitychange', handleVisibility);
    syncState();
    if (window.location.pathname !== '/') void checkForUpdates();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener(OTA_STATE_EVENT, handleState);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
      if (reminderTimer.current !== null) window.clearTimeout(reminderTimer.current);
    };
  }, [checkForUpdates, syncState]);

  const restartNow = useCallback(async () => {
    setError(null);
    setIsRestarting(true);
    try {
      await otaUpdateService.activatePending();
    } catch (restartError) {
      setError(restartError instanceof Error ? restartError.message : 'OTA activation failed');
      setIsRestarting(false);
    }
  }, []);

  const remindLater = useCallback(async () => {
    const update = await otaUpdateService.dismissPending();
    setPending(update);
    setPromptVisible(false);
    scheduleReminder(update);
  }, [scheduleReminder]);

  const value = useMemo<OtaUpdateContextValue>(
    () => ({ pending, promptVisible, isRestarting, error, restartNow, remindLater }),
    [pending, promptVisible, isRestarting, error, restartNow, remindLater],
  );

  return <OtaUpdateContext.Provider value={value}>{children}</OtaUpdateContext.Provider>;
}

export function useOtaUpdate(): OtaUpdateContextValue {
  const context = useContext(OtaUpdateContext);
  if (!context) throw new Error('useOtaUpdate must be used within OtaUpdateProvider');
  return context;
}
