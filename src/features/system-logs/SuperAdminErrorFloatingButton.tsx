"use client";

import { Bug, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import type { PersistentSystemLogEntry } from "@/features/system-logs/entities/persistent-system-log.entity";
import { persistentSystemLogApiService } from "@/features/system-logs/services/persistent-system-log-api-service";
import {
  getSystemLogsSnapshot,
  subscribeToSystemLogs,
} from "@/features/system-logs/system-log-store";

const REFRESH_MS = 20_000;

export function SuperAdminErrorFloatingButton() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = !isLoading && isSuperAdmin(session);
  const liveLogs = useSyncExternalStore(
    subscribeToSystemLogs,
    getSystemLogsSnapshot,
    getSystemLogsSnapshot,
  );
  const [persistentLogs, setPersistentLogs] = useState<
    PersistentSystemLogEntry[]
  >([]);

  useEffect(() => {
    const sessionToken = session?.sessionToken;
    if (!authorized || !sessionToken) {
      setPersistentLogs([]);
      return;
    }

    let cancelled = false;
    const load = () => {
      void persistentSystemLogApiService
        .list(sessionToken, { limit: 500 })
        .then((items) => {
          if (!cancelled) setPersistentLogs(items);
        })
        .catch((error) => {
          console.warn(
            "[SystemLogs] Failed to load floating error count.",
            error,
          );
        });
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onChanged = () => load();
    window.addEventListener("asol:system-logs-changed", onChanged);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("asol:system-logs-changed", onChanged);
    };
  }, [authorized, session]);

  const errorCount = useMemo(() => {
    const liveErrors = liveLogs
      .filter((entry) => entry.level === "error")
      .reduce((sum, entry) => sum + Math.max(1, entry.occurrences), 0);
    const persistentErrors = persistentLogs
      .filter((entry) => entry.level === "error")
      .reduce((sum, entry) => sum + Math.max(1, entry.occurrences), 0);
    return liveErrors + persistentErrors;
  }, [liveLogs, persistentLogs]);

  if (!authorized || errorCount === 0) return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/super-admin/logs")}
      className="fixed bottom-[calc(5.5rem+var(--asol-safe-area-bottom))] end-4 z-[145] flex min-h-12 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-error/40 bg-error px-4 py-3 text-sm font-bold text-on-error shadow-2xl shadow-error/25 transition hover:bg-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
      aria-label={`فتح سجل الأخطاء: ${errorCount}`}
      title="فتح سجل الأخطاء"
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <Bug className="h-5 w-5" />
        <span className="absolute -end-1 -top-1 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-error" />
      </span>
      <span className="tabular-nums">{errorCount}</span>
      <ChevronLeft className="h-4 w-4 shrink-0" />
    </button>
  );
}
