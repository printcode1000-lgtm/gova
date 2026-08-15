/** Single responsibility: run silent daily OTA work and expose settings-safe progress. */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type Context,
} from "react";

import {
  OTA_STATE_EVENT,
  otaUpdateService,
} from "./update-service";
import type { OtaDownloadProgress, OtaStoredState, OtaIdentity } from "../domain/release/manifest-types";
import { reportPreAuthFailure } from "@/features/system-logs/pre-auth-failure-reporter";

export interface OtaUpdateContextValue {
  state: OtaStoredState;
  progress: OtaDownloadProgress | null;
  busy: boolean;
  error: string | null;
  checkNow: () => Promise<void>;
  /** Activate a downloaded release now, instead of waiting for the next launch. */
  applyNow: () => Promise<void>;
}

export interface OtaUpdateProviderProps {
  children: ReactNode;
  identity?: OtaIdentity;
  isLoading?: boolean;
}

const OtaUpdateContext: Context<OtaUpdateContextValue | null> =
  typeof createContext === "function"
    ? createContext<OtaUpdateContextValue | null>(null)
    : (null as unknown as Context<OtaUpdateContextValue | null>);

export function OtaUpdateProvider({
  children,
  identity,
  isLoading = false,
}: OtaUpdateProviderProps) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const [state, setState] = useState<OtaStoredState>({});
  const [progress, setProgress] = useState<OtaDownloadProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => setState(await otaUpdateService.getState()), []);
  const report = useCallback((next: OtaDownloadProgress) => setProgress(next), []);

  const runDaily = useCallback(async () => {
    if (isLoading || pathname === "/" || !otaUpdateService.isEnabled()) return;
    setBusy(true);
    try {
      await otaUpdateService.enforceRevocations();
      await otaUpdateService.checkDailyAndDownload(report, identity);
      await sync();
    } catch (failure) {
      reportPreAuthFailure("ota-daily-check", failure, {}, "warn");
      await sync().catch((syncFailure) => {
        reportPreAuthFailure("ota-state-sync-after-failure", syncFailure);
      });
    } finally {
      setBusy(false);
    }
  }, [identity, isLoading, pathname, report, sync]);

  useEffect(() => {
    const handleState = (event: Event) =>
      setState((event as CustomEvent<OtaStoredState>).detail);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void runDaily();
    };
    window.addEventListener(OTA_STATE_EVENT, handleState);
    document.addEventListener("visibilitychange", handleVisibility);
    void sync().catch((failure) => {
      reportPreAuthFailure("ota-initial-state-sync", failure);
    });
    void runDaily().catch((failure) => {
      reportPreAuthFailure("ota-initial-daily-check", failure);
    });
    return () => {
      window.removeEventListener(OTA_STATE_EVENT, handleState);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [runDaily, sync]);

  const checkNow = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await otaUpdateService.checkAndDownload(report, identity);
    } catch (failure) {
      reportPreAuthFailure("ota-manual-check", failure);
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      await sync().catch((failure) => {
        reportPreAuthFailure("ota-state-sync-after-manual-check", failure);
      });
      setBusy(false);
    }
  }, [busy, identity, report, sync]);

  const applyNow = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await otaUpdateService.activatePending(identity);
      window.location.reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      reportPreAuthFailure("ota-apply-now", failure);
      await sync().catch((syncFailure) => {
        reportPreAuthFailure("ota-state-sync-after-apply", syncFailure);
      });
      setBusy(false);
    }
  }, [busy, identity, sync]);

  const value = useMemo(
    () => ({ state, progress, busy, error, checkNow, applyNow }),
    [state, progress, busy, error, checkNow, applyNow],
  );
  return <OtaUpdateContext.Provider value={value}>{children}</OtaUpdateContext.Provider>;
}

export function useOtaUpdate(): OtaUpdateContextValue {
  const context = useContext(OtaUpdateContext);
  if (!context) throw new Error("useOtaUpdate must be used within OtaUpdateProvider");
  return context;
}
