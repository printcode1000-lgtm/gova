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

interface OtaUpdateContextValue {
  state: OtaStoredState;
  progress: OtaDownloadProgress | null;
  busy: boolean;
  error: string | null;
  checkNow: () => Promise<void>;
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
      await otaUpdateService.checkDailyAndDownload(report, identity);
      await sync();
    } catch (failure) {
      console.warn("[AsolOTA] Silent daily check deferred", failure);
      await sync();
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
    void sync();
    void runDaily();
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
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      await sync();
      setBusy(false);
    }
  }, [busy, identity, report, sync]);

  const value = useMemo(
    () => ({ state, progress, busy, error, checkNow }),
    [state, progress, busy, error, checkNow],
  );
  return <OtaUpdateContext.Provider value={value}>{children}</OtaUpdateContext.Provider>;
}

export function useOtaUpdate(): OtaUpdateContextValue {
  const context = useContext(OtaUpdateContext);
  if (!context) throw new Error("useOtaUpdate must be used within OtaUpdateProvider");
  return context;
}
