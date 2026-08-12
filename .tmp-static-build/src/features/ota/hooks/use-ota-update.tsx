/** Single responsibility: run silent daily OTA work and expose settings-safe progress. */
"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import {
  OTA_STATE_EVENT,
  otaUpdateService,
} from "../services/ota-update-service";
import type { OtaDownloadProgress, OtaStoredState } from "../types/ota.types";
import { reportPreAuthFailure } from "@/features/system-logs/pre-auth-failure-reporter";

interface OtaUpdateContextValue {
  state: OtaStoredState;
  progress: OtaDownloadProgress | null;
  busy: boolean;
  error: string | null;
  checkNow: () => Promise<void>;
  /** Activate a downloaded release now, instead of waiting for the next launch. */
  applyNow: () => Promise<void>;
}

const OtaUpdateContext = createContext<OtaUpdateContextValue | null>(null);

export function OtaUpdateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, isLoading } = useSession();
  const [state, setState] = useState<OtaStoredState>({});
  const [progress, setProgress] = useState<OtaDownloadProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identity = session ?? undefined;
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

  /**
   * Install a release that is already downloaded and verified.
   *
   * Activation otherwise waits for the next launch, which the settings page
   * could only describe, never do — the user had to know to close the app.
   * `activatePending` switches the served path; reloading then serves it.
   */
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
